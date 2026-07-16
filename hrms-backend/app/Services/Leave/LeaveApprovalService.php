<?php
// app/Services/Leave/LeaveApprovalService.php

namespace App\Services\Leave;

use App\Models\Leave;
use App\Models\LeaveApproval;
use App\Models\Employee;
use App\Models\LeaveAuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeaveApprovalService
{
    protected HierarchicalApprovalService $hierarchyService;

    public function __construct(HierarchicalApprovalService $hierarchyService)
    {
        $this->hierarchyService = $hierarchyService;
    }

    /**
     * Approve a leave request
     */
    public function approveLeave(Leave $leave, Employee $approver, ?string $notes = null): Leave
    {
        // Find current pending approval for this approver
        $approval = LeaveApproval::where('leave_id', $leave->id)
            ->where('approver_id', $approver->id)
            ->where('status', 'pending')
            ->first();

        if (!$approval) {
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
            }

            $leave->save();

            DB::commit();

            Log::info("✅ Leave {$leave->id} approved by {$approver->id}");

            return $leave->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Reject a leave request
     */
    public function rejectLeave(Leave $leave, Employee $approver, string $reason): Leave
    {
        $approval = LeaveApproval::where('leave_id', $leave->id)
            ->where('approver_id', $approver->id)
            ->where('status', 'pending')
            ->first();

        if (!$approval) {
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

            DB::commit();

            Log::info("❌ Leave {$leave->id} rejected by {$approver->id}");

            return $leave->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get pending approvals for a manager (only subordinates)
     */
    public function getPendingApprovals(Employee $manager): array
    {
        $subordinates = $this->hierarchyService->getAllSubordinates($manager);
        $subordinateIds = array_column($subordinates, 'id');

        // Special case: CEO can see all pending approvals
        if ($manager->position && $manager->position->title === 'CEO') {
            return LeaveApproval::with(['leave', 'leave.employee', 'leave.leaveType'])
                ->where('approver_id', $manager->id)
                ->where('status', 'pending')
                ->orderBy('created_at', 'asc')
                ->get()
                ->toArray();
        }

        // Special case: HR Manager can see all pending approvals
        if ($manager->position && $manager->position->title === 'HR Manager') {
            return LeaveApproval::with(['leave', 'leave.employee', 'leave.leaveType'])
                ->where('approver_id', $manager->id)
                ->where('status', 'pending')
                ->orderBy('created_at', 'asc')
                ->get()
                ->toArray();
        }

        // Regular manager: only see subordinates
        if (empty($subordinateIds)) {
            return [];
        }

        return LeaveApproval::with(['leave', 'leave.employee', 'leave.leaveType'])
            ->where('approver_id', $manager->id)
            ->where('status', 'pending')
            ->whereHas('leave', function ($query) use ($subordinateIds) {
                $query->whereIn('employee_id', $subordinateIds);
            })
            ->orderBy('created_at', 'asc')
            ->get()
            ->toArray();
    }

    /**
     * Get leave approvals with details
     */
    public function getApprovalsWithDetails(Leave $leave): array
    {
        return LeaveApproval::with(['approver'])
            ->where('leave_id', $leave->id)
            ->orderBy('level')
            ->get()
            ->map(function ($approval) {
                return [
                    'id' => $approval->id,
                    'level' => $approval->level,
                    'approver' => $approval->approver ? [
                        'id' => $approval->approver->id,
                        'name' => $approval->approver->first_name . ' ' . $approval->approver->last_name,
                        'employee_id' => $approval->approver->employee_id,
                    ] : null,
                    'status' => $approval->status,
                    'notes' => $approval->notes,
                    'approved_at' => $approval->approved_at,
                ];
            })
            ->toArray();
    }
}