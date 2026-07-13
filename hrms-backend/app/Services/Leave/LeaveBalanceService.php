<?php
// app/Services/Leave/LeaveBalanceService.php

namespace App\Services\Leave;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class LeaveBalanceService
{
    public function ensureBalanceExists(Employee $employee): void
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Error ensuring balance exists: ' . $e->getMessage());
            throw $e;
        }
    }

    public function calculateAndCreateBalance(Employee $employee, LeaveType $leaveType, int $year): LeaveBalance
    {
        try {
            $yearsOfService = Carbon::parse($employee->hire_date)->diffInYears(Carbon::now());
            $hireDate = Carbon::parse($employee->hire_date);

            $baseEntitlement = $leaveType->days_per_year;

            if ($hireDate->year == $year && $hireDate->month > 1) {
                $monthsWorked = 12 - $hireDate->month + 1;
                $baseEntitlement = round(($baseEntitlement / 12) * $monthsWorked, 1);
            }

            $seniorityBonus = 0;
            if ($leaveType->code === 'AL') {
                if ($yearsOfService >= 6) $seniorityBonus = 2;
                elseif ($yearsOfService >= 3) $seniorityBonus = 1;
            }

            $totalEntitlement = $baseEntitlement + $seniorityBonus;

            return LeaveBalance::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                ],
                [
                    'base_entitlement' => $baseEntitlement,
                    'seniority_bonus' => $seniorityBonus,
                    'total_entitlement' => $totalEntitlement,
                    'remaining_days' => $totalEntitlement,
                ]
            );
        } catch (\Exception $e) {
            Log::error('Error calculating balance: ' . $e->getMessage());
            throw $e;
        }
    }

    public function updateBalanceAfterLeave(Employee $employee, LeaveType $leaveType, int $year, string $action, float $days): void
    {
        $balance = LeaveBalance::where([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'year' => $year,
        ])->first();

        if (!$balance) {
            $this->ensureBalanceExists($employee);
            $balance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year,
            ])->first();
        }

        if (!$balance) return;

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

    public function processCarryForward(int $year): int
    {
        $nextYear = $year + 1;
        $annualLeaveType = LeaveType::where('code', 'AL')->first();

        if (!$annualLeaveType) return 0;

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
