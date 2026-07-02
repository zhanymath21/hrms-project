<?php
// app/Services/Leave/LeaveApprovalService.php

namespace App\Services\Leave;

use App\Models\Leave;
use App\Models\LeaveApproval;
use App\Models\LeaveApprovalFlow;
use App\Models\Employee;
use App\Enums\LeaveStatusEnum;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class LeaveApprovalService
{
    /**
     * Get approval flow for employee
     */
    public function getApprovalFlow(Employee $employee): array
    {
        $flows = LeaveApprovalFlow::where('is_active', true)
            ->where(function ($query) use ($employee) {
                $query->where('department_id', $employee->department_id)
                    ->orWhereNull('department_id');
            })
            ->where(function ($query) use ($employee) {
                $query->where('position_id', $employee->position_id)
                    ->orWhereNull('position_id');
            })
            ->orderBy('level')
            ->get();

        $approvers = [];
        foreach ($flows as $flow) {
            $approver = null;
            switch ($flow->approver_type) {
                case 'manager':
                    $approver = Employee::find($employee->manager_id);
                    break;
                case 'hr':
                    $approver = Employee::whereHas('position', function ($q) {
                        $q->whereIn('title', ['HR Manager', 'HR Officer']);
                    })->first();
                    break;
                case 'director':
                    $approver = Employee::whereHas('position', function ($q) {
                        $q->whereIn('title', ['Director', 'CEO']);
                    })->first();
                    break;
                case 'custom':
                    $approver = Employee::find($flow->approver_id);
                    break;
            }

            if ($approver) {
                $approvers[] = [
                    'level' => $flow->level,
                    'approver_id' => $approver->id,
                    'approver_name' => $approver->first_name . ' ' . $approver->last_name,
                    'approver_type' => $flow->approver_type,
                ];
            }
        }

        return $approvers;
    }

    /**
     * Create leave with multi-level approval
     */
    public function createLeave(Employee $employee, array $data): Leave
    {
        $approvers = $this->getApprovalFlow($employee);

        if (empty($approvers)) {
            throw new \Exception('No approval flow configured for this employee');
        }

        DB::beginTransaction();

        try {
            // Create leave
            $leave = Leave::create([
                'employee_id' => $employee->id,
                'leave_type_id' => $data['leave_type_id'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'total_days' => $data['total_days'],
                'reason' => $data['reason'] ?? null,
                'attachment' => $data['attachment'] ?? null,
                'status' => 'pending',
                'approval_level' => 0,
                'total_approval_levels' => count($approvers),
            ]);

            // Create approval records
            foreach ($approvers as $approver) {
                LeaveApproval::create([
                    'leave_id' => $leave->id,
                    'approver_id' => $approver['approver_id'],
                    'level' => $approver['level'],
                    'status' => 'pending',
                ]);
            }

            DB::commit();

            return $leave->load('approvals.approver');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Approve leave at specific level
     */
    public function approveLeave(Leave $leave, Employee $approver, array $data = []): Leave
    {
        // Find the pending approval for this approver
        $approval = LeaveApproval::where('leave_id', $leave->id)
            ->where('approver_id', $approver->id)
            ->where('status', 'pending')
            ->first();

        if (!$approval) {
            throw new \Exception('No pending approval found for this approver');
        }

        DB::beginTransaction();

        try {
            // Update approval record
            $approval->update([
                'status' => 'approved',
                'notes' => $data['notes'] ?? null,
                'approved_at' => now(),
            ]);

            // Update leave approval level
            $leave->approval_level = $approval->level;

            // Check if all approvals are done
            $pendingApprovals = LeaveApproval::where('leave_id', $leave->id)
                ->where('status', 'pending')
                ->count();

            if ($pendingApprovals === 0) {
                $leave->status = 'approved';
            }

            $leave->save();

            DB::commit();

            return $leave->fresh()->load('approvals.approver');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Reject leave at specific level
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

            return $leave->fresh()->load('approvals.approver');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Upload attachment
     */
    public function uploadAttachment($file): string
    {
        $path = $file->store('leave-attachments', 'public');
        return $path;
    }

    /**
     * Get approval status for leave
     */
    public function getApprovalStatus(Leave $leave): array
    {
        $statuses = [];
        $approvals = $leave->approvals()->with('approver')->orderBy('level')->get();

        foreach ($approvals as $approval) {
            $statuses[] = [
                'level' => $approval->level,
                'approver' => $approval->approver->first_name . ' ' . $approval->approver->last_name,
                'status' => $approval->status,
                'notes' => $approval->notes,
                'approved_at' => $approval->approved_at,
            ];
        }

        return $statuses;
    }

    /**
     * Get pending approvals for user
     */
    public function getPendingApprovals(Employee $employee)
    {
        return LeaveApproval::with(['leave', 'leave.employee'])
            ->where('approver_id', $employee->id)
            ->where('status', 'pending')
            ->orderBy('created_at', 'asc')
            ->get();
    }
}