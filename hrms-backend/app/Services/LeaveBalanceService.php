<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class LeaveBalanceService
{
    /**
     * Calculate leave balance for an employee
     * Memperhitungkan probation period
     */
    public static function calculateBalance(Employee $employee, LeaveType $leaveType, int $year = null): array
    {
        $year = $year ?? date('Y');
        $hireDate = Carbon::parse($employee->hire_date);
        $today = Carbon::now();

        // Get probation end date
        $probationEndDate = $employee->probation_end_date
            ? Carbon::parse($employee->probation_end_date)
            : $hireDate->copy()->addMonths(3);

        $isOnProbation = $today->lt($probationEndDate);

        // For Annual Leave (AL) - No leave during probation
        if ($leaveType->code === 'AL' && $isOnProbation) {
            return [
                'total_days' => 0,
                'earned_days' => 0,
                'seniority_bonus_days' => 0,
                'carry_forward_days' => 0,
                'total_with_carry_forward' => 0,
                'years_of_service' => 0,
                'is_on_probation' => true,
                'probation_end_date' => $probationEndDate->format('Y-m-d'),
            ];
        }

        // Calculate service years AFTER probation
        $serviceStartDate = $isOnProbation ? $probationEndDate : $hireDate;
        $yearsOfService = $serviceStartDate->diffInYears($today);

        // Base days dari leave type
        $totalDays = $leaveType->days_per_year;
        $seniorityBonus = 0;

        // Special calculation for Annual Leave based on service years
        if ($leaveType->code === 'AL') {
            if ($yearsOfService >= 6) {
                // Over 6 years: 2 days/month = 24 days/year
                $daysPerYear = 24;
                $ratePerMonth = 2;
            } elseif ($yearsOfService >= 3) {
                // Over 3 years: 1 day/month = 12 days/year
                $daysPerYear = 12;
                $ratePerMonth = 1;
            } else {
                // 0-3 years: 1.5 days/month = 18 days/year
                $daysPerYear = 18;
                $ratePerMonth = 1.5;
            }

            // Calculate prorata for current year
            if ($hireDate->year == $year) {
                if ($isOnProbation && $probationEndDate->year == $year) {
                    // Count months after probation
                    $monthsWorked = max(0, $today->month - $probationEndDate->month + 1);
                } else {
                    // Count months from hire date
                    $monthsWorked = max(0, 12 - $hireDate->month + 1);
                }
            } else {
                // Full year
                $monthsWorked = $today->month;
            }

            $totalDays = round($ratePerMonth * $monthsWorked, 1);
            $seniorityBonus = 0;
        }
        // Seniority bonus for other leave types (if enabled)
        else if ($leaveType->seniority_enabled) {
            if ($yearsOfService >= 6) {
                $seniorityBonus = $leaveType->seniority_6_years_bonus ?? 0;
                $totalDays = $leaveType->days_per_year + $seniorityBonus;
            } elseif ($yearsOfService >= 3) {
                $seniorityBonus = $leaveType->seniority_3_years_bonus ?? 0;
                $totalDays = $leaveType->days_per_year + $seniorityBonus;
            }
        }

        // Prorata untuk employee baru (bergabung tahun ini) - for non-AL leaves
        if ($leaveType->code !== 'AL' && $hireDate->year == $year && $hireDate->month > 1) {
            $remainingMonths = 12 - $hireDate->month + 1;
            $totalDays = round(($leaveType->days_per_year / 12) * $remainingMonths);
            $seniorityBonus = 0;
        }

        // Carry forward dari tahun sebelumnya
        $carryForwardDays = 0;
        if ($leaveType->allow_carry_forward) {
            $previousBalance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year - 1,
            ])->first();

            if ($previousBalance && $previousBalance->remaining_days > 0) {
                $remainingFromLastYear = $previousBalance->remaining_days;
                $maxCarryForward = $leaveType->max_carry_forward_days ?? 6;
                $carryForwardDays = min($remainingFromLastYear, $maxCarryForward);
            }
        }

        return [
            'total_days' => $totalDays,
            'earned_days' => $totalDays - $seniorityBonus,
            'seniority_bonus_days' => $seniorityBonus,
            'carry_forward_days' => $carryForwardDays,
            'total_with_carry_forward' => $totalDays + $carryForwardDays,
            'years_of_service' => $yearsOfService,
            'is_on_probation' => $isOnProbation && $leaveType->code === 'AL',
            'probation_end_date' => $probationEndDate->format('Y-m-d'),
            'months_worked' => $monthsWorked ?? 0,
            'rate_per_month' => $ratePerMonth ?? 0,
        ];
    }

    /**
     * Create or update leave balance for employee
     */
    public static function createOrUpdateBalance(Employee $employee, LeaveType $leaveType, int $year = null): ?LeaveBalance
    {
        try {
            $year = $year ?? date('Y');
            $calculation = self::calculateBalance($employee, $leaveType, $year);

            // Get existing balance to preserve used_days and pending_days
            $existingBalance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year,
            ])->first();

            $usedDays = $existingBalance->used_days ?? 0;
            $pendingDays = $existingBalance->pending_days ?? 0;

            // Calculate remaining days
            $remainingDays = $calculation['total_with_carry_forward'] - $usedDays;
            if ($remainingDays < 0) $remainingDays = 0;

            $balance = LeaveBalance::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                ],
                [
                    'total_days' => $calculation['total_days'],
                    'earned_days' => $calculation['earned_days'],
                    'seniority_bonus_days' => $calculation['seniority_bonus_days'],
                    'carry_forward_days' => $calculation['carry_forward_days'],
                    'replacement_days' => $existingBalance->replacement_days ?? 0,
                    'used_days' => $usedDays,
                    'pending_days' => $pendingDays,
                    'remaining_days' => $remainingDays,
                    'expiry_date' => Carbon::create($year + 1, 3, 31)->format('Y-m-d'),
                ]
            );

            Log::info("Leave balance created/updated for employee {$employee->id}: {$leaveType->code} - {$calculation['total_days']} days");

            return $balance;
        } catch (\Exception $e) {
            Log::error("Error creating leave balance: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Initialize all leave balances for employee
     */
    public static function initializeBalances(Employee $employee): void
    {
        $leaveTypes = LeaveType::where('is_active', true)->get();
        $currentYear = date('Y');

        Log::info("Initializing leave balances for employee: {$employee->id} - {$employee->first_name} {$employee->last_name}");

        foreach ($leaveTypes as $leaveType) {
            self::createOrUpdateBalance($employee, $leaveType, $currentYear);
        }
    }

    /**
     * Refresh all balances (recalculate)
     */
    public static function refreshBalances(Employee $employee): void
    {
        $balances = LeaveBalance::where('employee_id', $employee->id)
            ->where('year', date('Y'))
            ->get();

        foreach ($balances as $balance) {
            self::createOrUpdateBalance($employee, $balance->leaveType, $balance->year);
        }
    }

    /**
     * Get balance summary for employee
     */
    public static function getBalanceSummary(Employee $employee, int $year = null): array
    {
        $year = $year ?? date('Y');
        $balances = LeaveBalance::with('leaveType')
            ->where('employee_id', $employee->id)
            ->where('year', $year)
            ->get();

        $summary = [];
        foreach ($balances as $balance) {
            $summary[] = [
                'id' => $balance->id,
                'leave_type_id' => $balance->leave_type_id,
                'leave_type' => $balance->leaveType->name,
                'leave_code' => $balance->leaveType->code,
                'total_days' => $balance->total_days,
                'used_days' => $balance->used_days,
                'pending_days' => $balance->pending_days,
                'remaining_days' => $balance->remaining_days,
                'carry_forward_days' => $balance->carry_forward_days,
                'seniority_bonus_days' => $balance->seniority_bonus_days,
                'replacement_days' => $balance->replacement_days,
                'expiry_date' => $balance->expiry_date,
            ];
        }

        return $summary;
    }
}
