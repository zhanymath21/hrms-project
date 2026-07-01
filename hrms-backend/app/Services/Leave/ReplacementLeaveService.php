<?php
// app/Services/Leave/ReplacementLeaveService.php

namespace App\Services\Leave;

use App\Models\Employee;
use App\Models\ReplacementLeave;
use App\Enums\LeaveStatusEnum;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReplacementLeaveService
{
    protected LeaveBalanceService $balanceService;

    public function __construct(LeaveBalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    /**
     * Create replacement leave request
     */
    public function createRequest(Employee $employee, array $data): ReplacementLeave
    {
        $workDate = Carbon::parse($data['work_date']);
        $replacementDate = Carbon::parse($data['replacement_date']);

        $this->validateRequest($employee, $workDate, $replacementDate);

        $daysToAdd = $data['hours_worked'] >= 8 ? 1 : 0.5;

        return ReplacementLeave::create([
            'employee_id' => $employee->id,
            'work_date' => $workDate->format('Y-m-d'),
            'work_day_type' => $data['work_day_type'],
            'hours_worked' => $data['hours_worked'],
            'replacement_date' => $replacementDate->format('Y-m-d'),
            'reason' => $data['reason'] ?? null,
            'days_to_add' => $daysToAdd,
            'status' => 'pending',
        ]);
    }

    /**
     * Validate replacement request
     */
    public function validateRequest(Employee $employee, Carbon $workDate, Carbon $replacementDate): void
    {
        if ($replacementDate->isWeekend()) {
            throw new \Exception('Replacement date cannot be on weekend. Please choose a weekday.');
        }

        $existing = ReplacementLeave::where('employee_id', $employee->id)
            ->where('work_date', $workDate->format('Y-m-d'))
            ->where('status', '!=', 'rejected')
            ->first();

        if ($existing) {
            throw new \Exception(
                "You already have a replacement request for this date (Status: {$existing->status})"
            );
        }
    }

    /**
     * Approve replacement
     */
    public function approve(ReplacementLeave $replacement, Employee $approver): void
    {
        if ($replacement->status !== 'pending') {
            throw new \Exception('This request is not pending');
        }

        DB::beginTransaction();
        try {
            $replacement->update([
                'status' => 'approved',
                'approved_by' => $approver->id,
                'approved_at' => now(),
            ]);

            // Add replacement days to Annual Leave
            $this->balanceService->addReplacementDays(
                $replacement->employee,
                $replacement->days_to_add
            );

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Reject replacement
     */
    public function reject(ReplacementLeave $replacement, ?string $reason = null): void
    {
        if ($replacement->status !== 'pending') {
            throw new \Exception('This request is not pending');
        }

        $replacement->update([
            'status' => 'rejected',
            'rejection_reason' => $reason ?? 'Rejected by manager',
        ]);
    }

    /**
     * Cancel replacement (by employee)
     */
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
}
