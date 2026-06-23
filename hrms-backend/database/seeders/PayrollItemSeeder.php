<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;
use App\Models\PayrollPeriod;
use App\Models\PayrollItem;
use App\Models\TaxSetting;
use Carbon\Carbon;

class PayrollItemSeeder extends Seeder
{
    public function run()
    {
        $employees = Employee::with('salarySetting')->get();
        $payrollPeriods = PayrollPeriod::all();
        $taxSettings = TaxSetting::getActive();

        $totalItems = 0;

        foreach ($payrollPeriods as $period) {
            $periodStart = Carbon::parse($period->start_date);
            $periodEnd = Carbon::parse($period->end_date);

            $workingDays = $this->calculateWorkingDays($periodStart, $periodEnd);
            $totalDaysInMonth = Carbon::parse($period->start_date)->daysInMonth;

            foreach ($employees as $employee) {
                $salarySetting = $employee->salarySetting;

                if (!$salarySetting) {
                    continue;
                }

                $isProrated = false;
                $proratedDays = $workingDays;
                $actualSalary = $salarySetting->basic_salary;

                $joinDate = $employee->hire_date ? Carbon::parse($employee->hire_date) : null;
                if ($joinDate && $joinDate > $periodStart) {
                    $proratedDays = $this->calculateWorkingDays($joinDate, $periodEnd);
                    $isProrated = true;
                }

                if ($isProrated) {
                    $monthlySalary = $salarySetting->basic_salary;
                    $dailyRate = $monthlySalary / $totalDaysInMonth;
                    $actualSalary = round($dailyRate * $proratedDays, 2);
                }

                $basicSalary = $actualSalary;
                $allowance = $this->calculateProratedAllowance($salarySetting, $workingDays, $totalDaysInMonth);
                $totalEarnings = $basicSalary + $allowance;

                $tax = 0;
                if ($taxSettings && !$salarySetting->is_tax_exempt) {
                    $tax = $taxSettings->calculateTax($totalEarnings, $salarySetting->dependents);
                }

                $nssf = 0;
                if ($taxSettings) {
                    $nssf = $taxSettings->calculateNSSF($basicSalary)['employee'];
                }

                $totalDeductions = $tax + $nssf;
                $netPay = $totalEarnings - $totalDeductions;

                PayrollItem::updateOrCreate(
                    [
                        'payroll_period_id' => $period->id,
                        'employee_id' => $employee->id,
                    ],
                    [
                        'basic_salary' => $basicSalary,
                        'allowance' => $allowance,
                        'overtime' => 0,
                        'bonus' => 0,
                        'commission' => 0,
                        'other_earnings' => 0,
                        'total_earnings' => $totalEarnings,
                        'tax' => $tax,
                        'social_security' => $nssf,
                        'health_insurance' => 0,
                        'loan' => 0,
                        'advance' => 0,
                        'other_deductions' => 0,
                        'total_deductions' => $totalDeductions,
                        'net_pay' => $netPay,
                        'working_days' => $workingDays,
                        'present_days' => $workingDays,
                        'absent_days' => 0,
                        'leave_days' => 0,
                        'holiday_days' => 0,
                        'overtime_hours' => 0,
                        'currency' => 'KHR',
                        'exchange_rate' => 1,
                        'is_prorated' => $isProrated,
                        'prorated_days' => $proratedDays,
                        'actual_salary' => $actualSalary,
                        'notes' => $isProrated ? 'Prorated for ' . $proratedDays . ' days' : null,
                    ]
                );

                $totalItems++;
            }

            $this->updatePayrollTotals($period);
        }

        $this->command->info('✅ ' . $totalItems . ' payroll items created');
    }

    private function calculateWorkingDays($startDate, $endDate)
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        $workingDays = 0;
        for ($date = $start->copy(); $date <= $end; $date->addDay()) {
            if ($date->isWeekday()) {
                $workingDays++;
            }
        }
        return $workingDays;
    }

    private function calculateProratedAllowance($salarySetting, $workingDays, $totalDaysInMonth)
    {
        $totalAllowance = ($salarySetting->housing_allowance ?? 0) +
            ($salarySetting->transport_allowance ?? 0) +
            ($salarySetting->meal_allowance ?? 0) +
            ($salarySetting->phone_allowance ?? 0) +
            ($salarySetting->other_allowance ?? 0);

        if ($workingDays < $totalDaysInMonth && $totalDaysInMonth > 0) {
            $dailyAllowance = $totalAllowance / $totalDaysInMonth;
            return round($dailyAllowance * $workingDays, 2);
        }

        return $totalAllowance;
    }

    private function updatePayrollTotals($period)
    {
        $items = $period->items;

        $totalEmployees = $items->count();
        $totalGross = $items->sum('total_earnings');
        $totalDeductions = $items->sum('total_deductions');
        $totalNet = $items->sum('net_pay');
        $totalTax = $items->sum('tax');

        $period->update([
            'total_employees' => $totalEmployees,
            'total_gross' => $totalGross,
            'total_deductions' => $totalDeductions,
            'total_net' => $totalNet,
            'total_tax' => $totalTax,
        ]);
    }
}
