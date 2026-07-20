<?php
// app/Services/Leave/LeaveApprovalService.php

namespace App\Services\Leave;

use App\Models\Leave;
use App\Models\LeaveApproval;
use App\Models\Employee;
use App\Models\LeaveAuditLog;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeaveApprovalService
{
    protected HierarchicalApprovalService $hierarchyService;
    protected NotificationService $notificationService;

    public function __construct(
        HierarchicalApprovalService $hierarchyService,
        NotificationService $notificationService
    ) {
        $this->hierarchyService = $hierarchyService;
        $this->notificationService = $notificationService;
    }

    /**
     * ==========================================
     * APPROVE LEAVE
     * ==========================================
     */

    /**
     * Approve a leave request
     */
    public function approveLeave(Leave $leave, Employee $approver, ?string $notes = null): Leave
    {
        Log::info('📝 Processing leave approval', [
            'leave_id' => $leave->id,
            'approver_id' => $approver->id,
            'approver_name' => $approver->first_name . ' ' . $approver->last_name,
        ]);

        // Find current pending approval for this approver
        $approval = LeaveApproval::where('leave_id', $leave->id)
            ->where('approver_id', $approver->id)
            ->where('status', 'pending')
            ->first();

        if (!$approval) {
            Log::warning('⚠️ No pending approval found', [
                'leave_id' => $leave->id,
                'approver_id' => $approver->id,
            ]);

            // Check if there's any approval for this user
            $anyApproval = LeaveApproval::where('leave_id', $leave->id)
                ->where('approver_id', $approver->id)
                ->first();

            if ($anyApproval) {
                Log::info('📋 Found existing approval but not pending', [
                    'status' => $anyApproval->status,
                    'is_selected' => $anyApproval->is_selected,
                    'level' => $anyApproval->level,
                ]);

                if ($anyApproval->status === 'approved') {
                    throw new \Exception('You have already approved this request');
                } elseif ($anyApproval->status === 'rejected') {
                    throw new \Exception('You have already rejected this request');
                }
            }

            throw new \Exception('No pending approval found for this approver');
        }

        DB::beginTransaction();

        try {
            // Update approval
            $approval->update([
                'status' => 'approved',
                'notes' => $notes,
                'approved_at' => now(),
            ]);

            // Update leave approval level
            $leave->approval_level = $approval->level;

            // Check if all approvals are done
            $pendingCount = LeaveApproval::where('leave_id', $leave->id)
                ->where('status', 'pending')
                ->count();

            if ($pendingCount === 0) {
                $leave->status = 'approved';
                Log::info("✅ Leave {$leave->id} fully approved by {$approver->id}");
            } else {
                Log::info("⏳ Leave {$leave->id} partially approved, {$pendingCount} approvals remaining");
            }

            $leave->save();

            // Log approval
            LeaveAuditLog::logApproved(
                $leave,
                $approver->id,
                $approval->level,
                $notes
            );

            DB::commit();

            // Send notification to employee
            $this->sendApprovalNotification($leave, $approver);

            // Send notification to next approver if any
            if ($leave->status === 'pending') {
                $this->sendNextApproverNotification($leave);
            }

            return $leave->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Error in approveLeave: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ==========================================
     * REJECT LEAVE
     * ==========================================
     */

    /**
     * Reject a leave request
     */
    public function rejectLeave(Leave $leave, Employee $approver, string $reason): Leave
    {
        Log::info('📝 Processing leave rejection', [
            'leave_id' => $leave->id,
            'approver_id' => $approver->id,
            'approver_name' => $approver->first_name . ' ' . $approver->last_name,
            'reason' => $reason,
        ]);

        $approval = LeaveApproval::where('leave_id', $leave->id)
            ->where('approver_id', $approver->id)
            ->where('status', 'pending')
            ->first();

        if (!$approval) {
            Log::warning('⚠️ No pending approval found for rejection', [
                'leave_id' => $leave->id,
                'approver_id' => $approver->id,
            ]);
            throw new \Exception('No pending approval found for this approver');
        }

        DB::beginTransaction();

        try {
            $approval->update([
                'status' => 'rejected',
                'notes' => $reason,
                'approved_at' => now(),
            ]);

            $leave->update([
                'status' => 'rejected',
                'rejection_reason' => $reason,
            ]);

            // Log rejection
            LeaveAuditLog::logRejected(
                $leave,
                $approver->id,
                $approval->level,
                $reason
            );

            DB::commit();

            Log::info("❌ Leave {$leave->id} rejected by {$approver->id}");

            // Send notification to employee
            $this->sendRejectionNotification($leave, $approver, $reason);

            return $leave->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Error in rejectLeave: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ==========================================
     * GET PENDING APPROVALS
     * ==========================================
     */

    /**
     * Get pending approvals for a manager
     */
    public function getPendingApprovals(Employee $manager): array
    {
        try {
            Log::info('📋 Fetching pending approvals for manager', [
                'manager_id' => $manager->id,
                'manager_name' => $manager->first_name . ' ' . $manager->last_name,
            ]);

            // Get all subordinates (direct and indirect)
            $subordinates = $this->hierarchyService->getAllSubordinates($manager);
            $subordinateIds = array_column($subordinates, 'id');

            Log::info('👥 Subordinates found', [
                'count' => count($subordinateIds),
                'ids' => $subordinateIds,
            ]);

            // Special case: CEO can see all pending approvals
            if ($manager->position && in_array($manager->position->title, ['CEO', 'GM', 'Director'])) {
                Log::info('👑 Special case: ' . $manager->position->title . ' can see all approvals');

                $approvals = LeaveApproval::with(['leave', 'leave.employee', 'leave.leaveType'])
                    ->where('approver_id', $manager->id)
                    ->where('status', 'pending')
                    ->orderBy('created_at', 'asc')
                    ->get();

                Log::info('📊 Found ' . $approvals->count() . ' pending approvals');

                return $approvals->toArray();
            }

            // Special case: HR Manager can see all pending approvals
            if ($manager->position && $manager->position->title === 'HR Manager') {
                Log::info('👔 Special case: HR Manager can see all approvals');

                $approvals = LeaveApproval::with(['leave', 'leave.employee', 'leave.leaveType'])
                    ->where('approver_id', $manager->id)
                    ->where('status', 'pending')
                    ->orderBy('created_at', 'asc')
                    ->get();

                Log::info('📊 Found ' . $approvals->count() . ' pending approvals');

                return $approvals->toArray();
            }

            // Regular manager: only see subordinates
            if (empty($subordinateIds)) {
                Log::info('ℹ️ Manager has no subordinates');
                return [];
            }

            // Get selected approvals
            $selectedApprovals = LeaveApproval::with(['leave', 'leave.employee', 'leave.leaveType'])
                ->where('approver_id', $manager->id)
                ->where('is_selected', true)
                ->where('status', 'pending')
                ->whereHas('leave', function ($query) use ($subordinateIds) {
                    $query->whereIn('employee_id', $subordinateIds);
                })
                ->orderBy('created_at', 'asc')
                ->get();

            // Get hierarchical approvals
            $hierarchicalApprovals = LeaveApproval::with(['leave', 'leave.employee', 'leave.leaveType'])
                ->where('approver_id', $manager->id)
                ->where('is_selected', false)
                ->where('status', 'pending')
                ->whereHas('leave', function ($query) use ($subordinateIds) {
                    $query->whereIn('employee_id', $subordinateIds);
                })
                ->orderBy('created_at', 'asc')
                ->get();

            // Merge and unique
            $allApprovals = $selectedApprovals->merge($hierarchicalApprovals)
                ->unique('id')
                ->values();

            Log::info('📊 Found ' . $allApprovals->count() . ' total pending approvals', [
                'selected' => $selectedApprovals->count(),
                'hierarchical' => $hierarchicalApprovals->count(),
            ]);

            return $allApprovals->toArray();
        } catch (\Exception $e) {
            Log::error('❌ Error in getPendingApprovals: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ==========================================
     * GET APPROVAL STATUS
     * ==========================================
     */

    /**
     * Get approval status for a leave
     */
    public function getApprovalStatus(Leave $leave): array
    {
        $approvals = LeaveApproval::where('leave_id', $leave->id)
            ->with('approver')
            ->orderBy('level')
            ->get();

        $status = [
            'total_levels' => $leave->total_approval_levels,
            'current_level' => $leave->approval_level,
            'is_completed' => $leave->status === 'approved',
            'is_rejected' => $leave->status === 'rejected',
            'is_pending' => $leave->status === 'pending',
            'approvals' => [],
        ];

        foreach ($approvals as $approval) {
            $status['approvals'][] = [
                'level' => $approval->level,
                'approver' => $approval->approver ? [
                    'id' => $approval->approver->id,
                    'name' => $approval->approver->first_name . ' ' . $approval->approver->last_name,
                    'employee_id' => $approval->approver->employee_id,
                ] : null,
                'status' => $approval->status,
                'notes' => $approval->notes,
                'is_selected' => $approval->is_selected,
                'approved_at' => $approval->approved_at,
            ];
        }

        return $status;
    }

    /**
     * Check if a user can approve a leave
     */
    public function canApprove(Leave $leave, Employee $user): bool
    {
        // Check if user is a selected approver
        $isSelected = LeaveApproval::where('leave_id', $leave->id)
            ->where('approver_id', $user->id)
            ->where('is_selected', true)
            ->where('status', 'pending')
            ->exists();

        if ($isSelected) {
            return true;
        }

        // Check if user is in hierarchical flow
        $isHierarchical = LeaveApproval::where('leave_id', $leave->id)
            ->where('approver_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        if ($isHierarchical) {
            return true;
        }

        // Special case: CEO can approve anything
        if ($user->position && $user->position->title === 'CEO') {
            return true;
        }

        // Special case: HR Manager can approve anything
        if ($user->position && $user->position->title === 'HR Manager') {
            return true;
        }

        return false;
    }

    /**
     * ==========================================
     * NOTIFICATION HELPERS
     * ==========================================
     */

    /**
     * Send approval notification to employee
     */
    protected function sendApprovalNotification(Leave $leave, Employee $approver): void
    {
        try {
            $leaveData = [
                'id' => $leave->id,
                'leave_type' => $leave->leaveType->name,
                'total_days' => $leave->total_days,
                'start_date' => $leave->start_date->format('d/m/Y'),
                'end_date' => $leave->end_date->format('d/m/Y'),
            ];

            $this->notificationService->sendLeaveApproved(
                $leave->employee,
                $approver,
                $leaveData
            );

            Log::info('📨 Approval notification sent to employee', [
                'employee_id' => $leave->employee->id,
                'leave_id' => $leave->id,
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error sending approval notification: ' . $e->getMessage());
        }
    }

    /**
     * Send rejection notification to employee
     */
    protected function sendRejectionNotification(Leave $leave, Employee $rejecter, string $reason): void
    {
        try {
            $leaveData = [
                'id' => $leave->id,
                'leave_type' => $leave->leaveType->name,
                'total_days' => $leave->total_days,
                'start_date' => $leave->start_date->format('d/m/Y'),
                'end_date' => $leave->end_date->format('d/m/Y'),
            ];

            $this->notificationService->sendLeaveRejected(
                $leave->employee,
                $rejecter,
                $leaveData,
                $reason
            );

            Log::info('📨 Rejection notification sent to employee', [
                'employee_id' => $leave->employee->id,
                'leave_id' => $leave->id,
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error sending rejection notification: ' . $e->getMessage());
        }
    }

    /**
     * Send notification to next approver
     */
    protected function sendNextApproverNotification(Leave $leave): void
    {
        try {
            $nextApproval = LeaveApproval::where('leave_id', $leave->id)
                ->where('status', 'pending')
                ->orderBy('level')
                ->first();

            if ($nextApproval && $nextApproval->approver) {
                $leaveData = [
                    'id' => $leave->id,
                    'leave_type' => $leave->leaveType->name,
                    'total_days' => $leave->total_days,
                    'start_date' => $leave->start_date->format('d/m/Y'),
                    'end_date' => $leave->end_date->format('d/m/Y'),
                    'reason' => $leave->reason,
                ];

                $this->notificationService->sendLeaveRequest(
                    $leave->employee,
                    [$nextApproval->approver_id],
                    $leaveData
                );

                Log::info('📨 Notification sent to next approver', [
                    'next_approver_id' => $nextApproval->approver_id,
                    'leave_id' => $leave->id,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('❌ Error sending next approver notification: ' . $e->getMessage());
        }
    }

    /**
     * ==========================================
     * HELPER METHODS
     * ==========================================
     */

    /**
     * Get approval for a specific approver
     */
    public function getApproval(Leave $leave, Employee $approver): ?LeaveApproval
    {
        return LeaveApproval::where('leave_id', $leave->id)
            ->where('approver_id', $approver->id)
            ->first();
    }

    /**
     * Check if all approvals are completed
     */
    public function isFullyApproved(Leave $leave): bool
    {
        $pendingCount = LeaveApproval::where('leave_id', $leave->id)
            ->where('status', 'pending')
            ->count();

        return $pendingCount === 0 && $leave->status === 'approved';
    }

    /**
     * Get approval progress percentage
     */
    public function getProgress(Leave $leave): int
    {
        $total = $leave->total_approval_levels;
        if ($total === 0) {
            return 0;
        }

        $approved = LeaveApproval::where('leave_id', $leave->id)
            ->where('status', 'approved')
            ->count();

        return round(($approved / $total) * 100);
    }

    /**
     * Get current approval stage
     */
    public function getCurrentStage(Leave $leave): ?LeaveApproval
    {
        return LeaveApproval::where('leave_id', $leave->id)
            ->where('status', 'pending')
            ->orderBy('level')
            ->first();
    }

    /**
     * Get all approvers for a leave
     */
    public function getAllApprovers(Leave $leave): array
    {
        return LeaveApproval::where('leave_id', $leave->id)
            ->with('approver')
            ->orderBy('level')
            ->get()
            ->map(function ($approval) {
                return [
                    'id' => $approval->approver_id,
                    'name' => $approval->approver ? $approval->approver->first_name . ' ' . $approval->approver->last_name : 'Unknown',
                    'level' => $approval->level,
                    'status' => $approval->status,
                    'is_selected' => $approval->is_selected,
                ];
            })
            ->toArray();
    }
}