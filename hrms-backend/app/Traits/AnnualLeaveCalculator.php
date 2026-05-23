<?php
// app/Traits/AnnualLeaveCalculator.php

namespace App\Traits;

use App\Models\Employee;
use Carbon\Carbon;

trait AnnualLeaveCalculator
{
    /**
     * Calculate Annual Leave accrual based on service years and probation
     * 
     * Rules:
     * - Probation period: 0 days
     * - After probation (0-3 years): 1.5 days/month = 18 days/year
     * - 3-6 years service: 1 day/month = 12 days/year
     * - 6+ years service: 2 days/month = 24 days/year
     */
    protected function calculateAnnualLeave(Employee $employee, ?int $year = null): array
    {
        $year = $year ?? Carbon::now()->year;
        $today = Carbon::now();
        $hireDate = Carbon::parse($employee->hire_date);

        // Determine probation end date
        $probationEndDate = $employee->probation_end_date
            ? Carbon::parse($employee->probation_end_date)
            : $hireDate->copy()->addMonths(3);

        // Check if still on probation
        $isOnProbation = $today->lt($probationEndDate);

        if ($isOnProbation) {
            return [
                'is_on_probation' => true,
                'probation_end_date' => $probationEndDate->format('Y-m-d'),
                'total_days' => 0,
                'earned_days' => 0,
                'rate_per_month' => 0,
                'months_worked' => 0,
                'service_years' => 0,
                'message' => 'Employee is on probation until ' . $probationEndDate->format('d/m/Y'),
            ];
        }

        // Calculate service years AFTER probation
        $serviceStartDate = $probationEndDate;
        $serviceYears = $serviceStartDate->diffInYears($today);

        // Determine rate per month based on service years
        if ($serviceYears >= 6) {
            $ratePerMonth = 2; // 24 days per year
            $daysPerYear = 24;
        } elseif ($serviceYears >= 3) {
            $ratePerMonth = 1; // 12 days per year
            $daysPerYear = 12;
        } else {
            $ratePerMonth = 1.5; // 18 days per year
            $daysPerYear = 18;
        }

        // Calculate months worked in current year
        $monthsWorked = $this->calculateMonthsWorked($employee, $probationEndDate, $year);

        // Total accrued days this year
        $totalAccrued = $ratePerMonth * $monthsWorked;

        return [
            'is_on_probation' => false,
            'probation_end_date' => $probationEndDate->format('Y-m-d'),
            'service_years' => round($serviceYears, 1),
            'rate_per_month' => $ratePerMonth,
            'days_per_year' => $daysPerYear,
            'months_worked' => $monthsWorked,
            'total_days' => round($totalAccrued, 1),
            'earned_days' => round($totalAccrued, 1),
        ];
    }

    /**
     * Calculate months worked in a specific year
     */
    private function calculateMonthsWorked(Employee $employee, Carbon $probationEndDate, int $year): int
    {
        $today = Carbon::now();
        $currentYear = $today->year;

        if ($year != $currentYear) {
            // For past/future years, return full months if applicable
            return ($probationEndDate->year <= $year) ? 12 : 0;
        }

        // For current year
        if ($probationEndDate->year < $currentYear) {
            // Probation ended in previous year, count all months up to current month
            return $today->month;
        }

        if ($probationEndDate->year == $currentYear) {
            // Probation ends this year, count months after probation
            $monthsAfterProbation = $today->month - $probationEndDate->month + 1;
            return max(0, $monthsAfterProbation);
        }

        return 0;
    }

    /**
     * Get accrual rate for an employee
     */
    protected function getAccrualRate(Employee $employee): array
    {
        $today = Carbon::now();
        $hireDate = Carbon::parse($employee->hire_date);
        $probationEndDate = $employee->probation_end_date
            ? Carbon::parse($employee->probation_end_date)
            : $hireDate->copy()->addMonths(3);

        if ($today->lt($probationEndDate)) {
            return ['rate' => 0, 'period' => 'probation'];
        }

        $serviceYears = $probationEndDate->diffInYears($today);

        if ($serviceYears >= 6) {
            return ['rate' => 2, 'period' => '6+ years', 'days_per_year' => 24];
        } elseif ($serviceYears >= 3) {
            return ['rate' => 1, 'period' => '3-6 years', 'days_per_year' => 12];
        } else {
            return ['rate' => 1.5, 'period' => '0-3 years', 'days_per_year' => 18];
        }
    }
}
