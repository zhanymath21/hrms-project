<?php
// app/Services/Leave/LeaveService.php

namespace App\Services\Leave;

use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Enums\LeaveStatusEnum;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeaveService
{
    protected LeaveBalanceService $balanceService;

    public function __construct(LeaveBalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    /**
     * Calculate working days between two dates (exclude weekends)
     */
    public function calculateWorkingDays(string $startDate, string $endDate): float
    {
        $days = 0;
        $current = Carbon::parse($startDate)->copy();
        $end = Carbon::parse($endDate)->copy();

        while ($current <= $end) {
            if (!$current->isWeekend()) {
                $days++;
            }
            $current->addDay();
        }

        return max(1, $days);
    }

    /**
     * Create leave request
     */
    public function createLeave(Employee $employee, array $data): Leave
    {
        $startDate = Carbon::parse($data['start_date']);
        $endDate = Carbon::parse($data['end_date']);
        $totalDays = $this->calculateWorkingDays($startDate, $endDate);

        // Validate balance
        $this->validateBalance($employee, $data['leave_type_id'], $totalDays);

        DB::beginTransaction();
        try {
            $leave = Leave::create([
                'employee_id' => $employee->id,
                'leave_type_id' => $data['leave_type_id'],
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'total_days' => $totalDays,
                'reason' => $data['reason'] ?? null,
                'attachment' => $data['attachment'] ?? null,
                'status' => LeaveStatusEnum::PENDING->value,
            ]);

            // Update balance
            $this->balanceService->updateBalanceAfterLeave(
                $employee,
                LeaveType::find($data['leave_type_id']),
                date('Y'),
                'pending',
                $totalDays
            );

            DB::commit();

            return $leave;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Validate balance
     */
    public function validateBalance(Employee $employee, int $leaveTypeId, float $days): void
    {
        $balance = LeaveBalance::where([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveTypeId,
            'year' => date('Y'),
        ])->first();

        if (!$balance || $balance->remaining_days < $days) {
            throw new \Exception(
                "Insufficient balance! Need {$days} days, available: " . ($balance->remaining_days ?? 0)
            );
        }
    }

    /**
     * Approve leave
     */
    public function approveLeave(Leave $leave, Employee $approver): void
    {
        if ($leave->status !== LeaveStatusEnum::PENDING->value) {
            throw new \Exception('Leave is not pending');
        }

        DB::beginTransaction();
        try {
            $leave->update([
                'status' => LeaveStatusEnum::APPROVED->value,
                'approved_by' => $approver->id,
                'approved_at' => now(),
            ]);

            $this->balanceService->updateBalanceAfterLeave(
                $leave->employee,
                $leave->leaveType,
                date('Y', strtotime($leave->start_date)),
                'approve',
                $leave->total_days
            );

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Reject leave
     */
    public function rejectLeave(Leave $leave, Employee $rejector, ?string $reason = null): void
    {
        if ($leave->status !== LeaveStatusEnum::PENDING->value) {
            throw new \Exception('Leave is not pending');
        }

        DB::beginTransaction();
        try {
            $leave->update([
                'status' => LeaveStatusEnum::REJECTED->value,
                'rejection_reason' => $reason ?? 'No reason provided',
            ]);

            $this->balanceService->updateBalanceAfterLeave(
                $leave->employee,
                $leave->leaveType,
                date('Y', strtotime($leave->start_date)),
                'reject',
                $leave->total_days
            );

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Cancel leave (by employee)
     */
    public function cancelLeave(Leave $leave, Employee $canceller): void
    {
        if ($leave->employee_id !== $canceller->id) {
            throw new \Exception('You can only cancel your own leave requests');
        }

        if ($leave->status !== LeaveStatusEnum::PENDING->value) {
            throw new \Exception('Only pending leave requests can be cancelled');
        }

        DB::beginTransaction();
        try {
            $leave->update([
                'status' => LeaveStatusEnum::CANCELLED->value,
                'cancelled_by' => $canceller->id,
                'cancelled_at' => now(),
            ]);

            $this->balanceService->updateBalanceAfterLeave(
                $leave->employee,
                $leave->leaveType,
                date('Y', strtotime($leave->start_date)),
                'cancel',
                $leave->total_days
            );

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
