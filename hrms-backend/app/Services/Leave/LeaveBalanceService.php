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
        try {
            $currentYear = date('Y');
            $leaveTypes = LeaveType::where('is_active', true)->get();

            if ($leaveTypes->isEmpty()) {
                Log::warning('No leave types found, creating default');
                $this->createDefaultLeaveTypes();
                $leaveTypes = LeaveType::where('is_active', true)->get();
            }

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

    /**
     * Create default leave types
     */
    private function createDefaultLeaveTypes(): void
    {
        $defaultTypes = [
            ['code' => 'AL', 'name' => 'Annual Leave', 'days_per_year' => 12, 'is_paid' => true, 'allow_carry_forward' => true, 'max_carry_forward_days' => 6],
            ['code' => 'SL', 'name' => 'Sick Leave', 'days_per_year' => 14, 'is_paid' => true, 'allow_carry_forward' => false, 'max_carry_forward_days' => 0],
            ['code' => 'SPL', 'name' => 'Special Leave', 'days_per_year' => 3, 'is_paid' => true, 'allow_carry_forward' => false, 'max_carry_forward_days' => 0],
        ];

        foreach ($defaultTypes as $type) {
            LeaveType::firstOrCreate(
                ['code' => $type['code']],
                $type
            );
        }
    }

    /**
     * Calculate and create balance
     */
    public function calculateAndCreateBalance(Employee $employee, LeaveType $leaveType, int $year): LeaveBalance
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Error calculating balance: ' . $e->getMessage());
            throw $e;
        }
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
     * Calculate seniority bonus
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
     * Calculate carry forward
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
        try {
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

            if (!$balance) {
                Log::warning('Balance not found for employee: ' . $employee->id);
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
        } catch (\Exception $e) {
            Log::error('Error updating balance: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Add replacement days
     */
    public function addReplacementDays(Employee $employee, float $days): void
    {
        try {
            $annualLeaveType = LeaveType::where('code', 'AL')->first();
            if (!$annualLeaveType) {
                Log::warning('Annual leave type not found');
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
        } catch (\Exception $e) {
            Log::error('Error adding replacement days: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process carry forward
     */
    public function processCarryForward(int $year): int
    {
        try {
            $nextYear = $year + 1;
            $annualLeaveType = LeaveType::where('code', 'AL')->first();

            if (!$annualLeaveType) {
                Log::warning('Annual leave type not found');
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
        } catch (\Exception $e) {
            Log::error('Error processing carry forward: ' . $e->getMessage());
            throw $e;
        }
    }
}
