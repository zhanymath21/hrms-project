<?php
// app/Services/Leave/LeaveBalanceService.php

namespace App\Services\Leave;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeaveBalanceService
{
    /**
     * Ensure leave balance exists for employee
     */
    public function ensureBalanceExists(Employee $employee): void
    {
        $currentYear = date('Y');
        $leaveTypes = LeaveType::where('is_active', true)->get();

        foreach ($leaveTypes as $leaveType) {
            $exists = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $currentYear,
            ])->exists();

            if (!$exists) {
                $this->calculateAndCreateBalance($employee, $leaveType, $currentYear);
            }
        }
    }

    /**
     * Calculate and create balance for employee
     */
    public function calculateAndCreateBalance(Employee $employee, LeaveType $leaveType, int $year): LeaveBalance
    {
        $yearsOfService = Carbon::parse($employee->hire_date)->diffInYears(Carbon::now());
        $hireDate = Carbon::parse($employee->hire_date);

        $baseEntitlement = $this->calculateBaseEntitlement($leaveType, $hireDate, $year);
        $seniorityBonus = $this->calculateSeniorityBonus($leaveType, $yearsOfService);
        $carryForward = $this->calculateCarryForward($employee, $leaveType, $year);
        $replacementDays = $this->calculateReplacementDays($employee, $leaveType, $year);

        $totalEntitlement = $baseEntitlement + $seniorityBonus + $carryForward + $replacementDays;

        return LeaveBalance::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year,
            ],
            [
                'base_entitlement' => $baseEntitlement,
                'seniority_bonus' => $seniorityBonus,
                'carry_forward' => $carryForward,
                'replacement_days' => $replacementDays,
                'total_entitlement' => $totalEntitlement,
                'used_days' => 0,
                'pending_days' => 0,
                'remaining_days' => $totalEntitlement,
            ]
        );
    }

    /**
     * Calculate base entitlement
     */
    private function calculateBaseEntitlement(LeaveType $leaveType, Carbon $hireDate, int $year): float
    {
        $baseEntitlement = $leaveType->days_per_year;

        // Prorata for new employees
        if ($hireDate->year == $year && $hireDate->month > 1) {
            $monthsWorked = 12 - $hireDate->month + 1;
            $baseEntitlement = round(($baseEntitlement / 12) * $monthsWorked, 1);
        }

        return $baseEntitlement;
    }

    /**
     * Calculate seniority bonus (only for Annual Leave)
     */
    private function calculateSeniorityBonus(LeaveType $leaveType, int $yearsOfService): float
    {
        if ($leaveType->code !== 'AL') {
            return 0;
        }

        if ($yearsOfService >= 6) {
            return 2;
        }

        if ($yearsOfService >= 3) {
            return 1;
        }

        return 0;
    }

    /**
     * Calculate carry forward (only for Annual Leave)
     */
    private function calculateCarryForward(Employee $employee, LeaveType $leaveType, int $year): float
    {
        if ($leaveType->code !== 'AL' || !$leaveType->allow_carry_forward) {
            return 0;
        }

        $previousBalance = LeaveBalance::where([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'year' => $year - 1,
        ])->first();

        if ($previousBalance && $previousBalance->remaining_days > 0) {
            return min($previousBalance->remaining_days, $leaveType->max_carry_forward_days);
        }

        return 0;
    }

    /**
     * Calculate replacement days
     */
    private function calculateReplacementDays(Employee $employee, LeaveType $leaveType, int $year): float
    {
        $previousBalance = LeaveBalance::where([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'year' => $year - 1,
        ])->first();

        return $previousBalance->replacement_days ?? 0;
    }

    /**
     * Update balance after leave action
     */
    public function updateBalanceAfterLeave(
        Employee $employee,
        LeaveType $leaveType,
        int $year,
        string $action,
        float $days
    ): void {
        $balance = LeaveBalance::where([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'year' => $year,
        ])->first();

        if (!$balance) {
            return;
        }

        switch ($action) {
            case 'pending':
                $balance->pending_days += $days;
                $balance->remaining_days -= $days;
                break;
            case 'approve':
                $balance->pending_days -= $days;
                $balance->used_days += $days;
                break;
            case 'reject':
            case 'cancel':
                $balance->pending_days -= $days;
                $balance->remaining_days += $days;
                break;
        }

        $balance->save();
    }

    /**
     * Add replacement days to balance
     */
    public function addReplacementDays(Employee $employee, float $days): void
    {
        $annualLeaveType = LeaveType::where('code', 'AL')->first();
        if (!$annualLeaveType) {
            return;
        }

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

    /**
     * Process carry forward
     */
    public function processCarryForward(int $year): int
    {
        $nextYear = $year + 1;
        $annualLeaveType = LeaveType::where('code', 'AL')->first();

        if (!$annualLeaveType) {
            return 0;
        }

        $balances = LeaveBalance::where([
            'leave_type_id' => $annualLeaveType->id,
            'year' => $year,
        ])->where('remaining_days', '>', 0)->get();

        $processed = 0;
        foreach ($balances as $balance) {
            $carryForward = min($balance->remaining_days, $annualLeaveType->max_carry_forward_days);

            $balance->update([
                'carry_forward' => $carryForward,
                'remaining_days' => 0,
            ]);

            $nextBalance = LeaveBalance::firstOrCreate(
                [
                    'employee_id' => $balance->employee_id,
                    'leave_type_id' => $annualLeaveType->id,
                    'year' => $nextYear,
                ],
                [
                    'base_entitlement' => $annualLeaveType->days_per_year,
                    'total_entitlement' => $annualLeaveType->days_per_year,
                    'remaining_days' => $annualLeaveType->days_per_year,
                ]
            );

            $nextBalance->update([
                'carry_forward' => $carryForward,
                'total_entitlement' => $nextBalance->base_entitlement + $carryForward,
                'remaining_days' => $nextBalance->remaining_days + $carryForward,
            ]);

            $processed++;
        }

        return $processed;
    }
}
