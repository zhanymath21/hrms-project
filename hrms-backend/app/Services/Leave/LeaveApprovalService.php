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
                'status' => 'approved',
                'notes' => $notes,
                'approved_at' => now(),
            ]);

            $leave->approval_level = $approval->level;

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
     * Get pending approvals for a manager
     */
    public function getPendingApprovals(Employee $manager): array
    {
        $subordinates = $this->hierarchyService->getAllSubordinates($manager);
        $subordinateIds = array_column($subordinates, 'id');

        // Special case: CEO, HR Manager, GM can see all
        if ($manager->position && in_array($manager->position->title, ['CEO', 'HR Manager', 'GM'])) {
            return LeaveApproval::with(['leave', 'leave.employee', 'leave.leaveType'])
                ->where('approver_id', $manager->id)
                ->where('status', 'pending')
                ->orderBy('created_at', 'asc')
                ->get()
                ->toArray();
        }

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
}