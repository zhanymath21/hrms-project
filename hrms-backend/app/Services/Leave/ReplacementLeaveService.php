<?php
// app/Services/Leave/ReplacementLeaveService.php

namespace App\Services\Leave;

use App\Models\ReplacementLeave;
use App\Models\ReplacementLeaveApproval;
use App\Models\ReplacementApprovalFlow;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReplacementLeaveService
{
    protected LeaveBalanceService $balanceService;

    public function __construct(LeaveBalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    public function getApprovalFlow(Employee $employee): array
    {
        $flows = ReplacementApprovalFlow::where('is_active', true)
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
            $approver = $this->getApproverByType($flow, $employee);
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

    private function getApproverByType($flow, Employee $employee)
    {
        switch ($flow->approver_type) {
            case 'manager':
                return Employee::find($employee->manager_id);
            case 'hr':
                return Employee::whereHas('position', function ($q) {
                    $q->whereIn('title', ['HR Manager', 'HR Officer']);
                })->first();
            case 'director':
                return Employee::whereHas('position', function ($q) {
                    $q->whereIn('title', ['Director', 'CEO']);
                })->first();
            case 'custom':
                return Employee::find($flow->approver_id);
            default:
                return null;
        }
    }

    public function createRequest(Employee $employee, array $data): ReplacementLeave
    {
        $approvers = $this->getApprovalFlow($employee);

        if (empty($approvers)) {
            throw new \Exception('No approval flow configured for this employee.');
        }

        $workDate = Carbon::parse($data['work_date']);
        $replacementDate = Carbon::parse($data['replacement_date']);

        $this->validateRequest($employee, $workDate, $replacementDate);

        $daysToAdd = $data['hours_worked'] >= 8 ? 1 : 0.5;

        DB::beginTransaction();

        try {
            $replacement = ReplacementLeave::create([
                'employee_id' => $employee->id,
                'work_date' => $workDate->format('Y-m-d'),
                'work_day_type' => $data['work_day_type'],
                'hours_worked' => $data['hours_worked'],
                'replacement_date' => $replacementDate->format('Y-m-d'),
                'days_to_add' => $daysToAdd,
                'reason' => $data['reason'] ?? null,
                'attachment' => $data['attachment'] ?? null,
                'status' => 'pending',
                'approval_level' => 0,
                'total_approval_levels' => count($approvers),
            ]);

            foreach ($approvers as $approver) {
                ReplacementLeaveApproval::create([
                    'replacement_leave_id' => $replacement->id,
                    'approver_id' => $approver['approver_id'],
                    'level' => $approver['level'],
                    'status' => 'pending',
                ]);
            }

            DB::commit();

            return $replacement->load('approvals.approver');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function validateRequest(Employee $employee, Carbon $workDate, Carbon $replacementDate): void
    {
        if ($replacementDate->isWeekend()) {
            throw new \Exception('Replacement date cannot be on weekend.');
        }

        $existing = ReplacementLeave::where('employee_id', $employee->id)
            ->where('work_date', $workDate->format('Y-m-d'))
            ->where('status', '!=', 'rejected')
            ->first();

        if ($existing) {
            throw new \Exception("You already have a replacement request for this date (Status: {$existing->status})");
        }
    }

    public function approve(ReplacementLeave $replacement, Employee $approver, array $data = []): ReplacementLeave
    {
        $approval = ReplacementLeaveApproval::where('replacement_leave_id', $replacement->id)
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
                'notes' => $data['notes'] ?? null,
                'approved_at' => now(),
            ]);

            $replacement->approval_level = $approval->level;

            $pendingApprovals = ReplacementLeaveApproval::where('replacement_leave_id', $replacement->id)
                ->where('status', 'pending')
                ->count();

            if ($pendingApprovals === 0) {
                $replacement->status = 'approved';
                $this->addToAnnualLeaveBalance($replacement->employee, $replacement->days_to_add);
            }

            $replacement->save();

            DB::commit();

            return $replacement->fresh()->load('approvals.approver');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function reject(ReplacementLeave $replacement, Employee $rejector, string $reason): ReplacementLeave
    {
        $approval = ReplacementLeaveApproval::where('replacement_leave_id', $replacement->id)
            ->where('approver_id', $rejector->id)
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

            $replacement->update([
                'status' => 'rejected',
                'rejection_reason' => $reason,
            ]);

            DB::commit();

            return $replacement->fresh()->load('approvals.approver');
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function cancel(ReplacementLeave $replacement, Employee $canceller, ?string $reason = null): void
    {
        if ($replacement->employee_id !== $canceller->id) {
            throw new \Exception('You can only cancel your own replacement requests');
        }

        if ($replacement->status !== 'pending') {
            throw new \Exception('Only pending replacement requests can be cancelled');
        }

        $replacement->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancelled_by' => $canceller->id,
            'cancellation_reason' => $reason ?? 'Cancelled by employee',
        ]);
    }

    private function addToAnnualLeaveBalance(Employee $employee, float $days): void
    {
        $annualLeaveType = LeaveType::where('code', 'AL')->first();
        if (!$annualLeaveType) return;

        $balance = LeaveBalance::firstOrCreate(
            [
                'employee_id' => $employee->id,
                'leave_type_id' => $annualLeaveType->id,
                'year' => date('Y'),
            ],
            [
                'base_entitlement' => $annualLeaveType->days_per_year,
                'total_entitlement' => $annualLeaveType->days_per_year,
                'remaining_days' => $annualLeaveType->days_per_year,
            ]
        );

        $balance->replacement_days += $days;
        $balance->total_entitlement += $days;
        $balance->remaining_days += $days;
        $balance->save();
    }

    public function uploadAttachment($file): string
    {
        return $file->store('replacement-attachments', 'public');
    }

    public function getPendingApprovals(Employee $employee)
    {
        return ReplacementLeaveApproval::with(['replacementLeave', 'replacementLeave.employee'])
            ->where('approver_id', $employee->id)
            ->where('status', 'pending')
            ->orderBy('created_at', 'asc')
            ->get();
    }
}
