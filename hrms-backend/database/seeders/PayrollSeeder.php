<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;
use App\Models\PayrollPeriod;
use App\Models\PayrollItem;
use App\Models\EmployeeSalarySetting;
use App\Models\TaxSetting;
use Carbon\Carbon;

class PayrollSeeder extends Seeder
{
    public function run()
    {
        // 1. Create Tax Settings
        $this->createTaxSettings();

        // 2. Create Employees with Salary Settings
        $employees = $this->createEmployees();

        // 3. Create Payroll Periods
        $payrollPeriods = $this->createPayrollPeriods();

        // 4. Create Payroll Items for each period
        $this->createPayrollItems($payrollPeriods, $employees);
    }

    /**
     * Create Tax Settings
     */
    private function createTaxSettings()
    {
        $taxBrackets = [
            [
                'threshold' => 0,
                'rate' => 0,
                'description' => '0% - No tax'
            ],
            [
                'threshold' => 1500000,
                'rate' => 5,
                'description' => '5% on first 1,500,000 KHR'
            ],
            [
                'threshold' => 2000000,
                'rate' => 10,
                'description' => '10% on next 2,000,000 KHR'
            ],
            [
                'threshold' => 8500000,
                'rate' => 15,
                'description' => '15% on next 8,500,000 KHR'
            ],
            [
                'threshold' => 12500000,
                'rate' => 20,
                'description' => '20% on next 12,500,000 KHR'
            ],
        ];

        $socialSecurityBrackets = [
            'max_salary' => 1200000,
        ];

        TaxSetting::updateOrCreate(
            ['year' => date('Y')],
            [
                'tax_brackets' => $taxBrackets,
                'personal_relief' => 1500000,
                'dependent_relief' => 150000,
                'nssf_employee_rate' => 2.5,
                'nssf_employer_rate' => 2.5,
                'social_security_brackets' => $socialSecurityBrackets,
                'minimum_wage' => 1000000,
                'is_active' => true,
                'notes' => 'Cambodia Tax Settings ' . date('Y'),
            ]
        );

        $this->command->info('✅ Tax settings created');
    }

    /**
     * Create Employees with Salary Settings
     */
    private function createEmployees()
    {
        $employees = [];

        // Employee 1: HR Manager
        $employee1 = Employee::updateOrCreate(
            ['email' => 'hr.manager@company.com'],
            [
                'first_name' => 'Sokha',
                'last_name' => 'Chea',
                'employee_id' => 'EMP001',
                'phone' => '012345678',
                'gender' => 'female',
                'hire_date' => '2020-01-15',
                'employment_status' => 'permanent',
                'employment_type' => 'full_time',
                'status' => 'active',
                'position_id' => 1, // HR Manager
                'department_id' => 1, // HR
                'salary' => 2500000,
            ]
        );
        $employees[] = $employee1;

        // Create salary setting for employee 1
        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee1->id],
            [
                'basic_salary' => 2500000,
                'housing_allowance' => 300000,
                'transport_allowance' => 150000,
                'meal_allowance' => 80000,
                'phone_allowance' => 50000,
                'other_allowance' => 100000,
                'dependents' => 2,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ACLEDA Bank',
                'bank_account_number' => '1234567890',
                'bank_account_name' => 'Sokha Chea',
                'currency' => 'KHR',
            ]
        );

        // Employee 2: HR Officer
        $employee2 = Employee::updateOrCreate(
            ['email' => 'hr.officer@company.com'],
            [
                'first_name' => 'Dara',
                'last_name' => 'Sok',
                'employee_id' => 'EMP002',
                'phone' => '012345679',
                'gender' => 'male',
                'hire_date' => '2021-06-01',
                'employment_status' => 'permanent',
                'employment_type' => 'full_time',
                'status' => 'active',
                'position_id' => 2, // HR Officer
                'department_id' => 1, // HR
                'salary' => 1800000,
            ]
        );
        $employees[] = $employee2;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee2->id],
            [
                'basic_salary' => 1800000,
                'housing_allowance' => 200000,
                'transport_allowance' => 100000,
                'meal_allowance' => 60000,
                'phone_allowance' => 30000,
                'other_allowance' => 50000,
                'dependents' => 1,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ABA Bank',
                'bank_account_number' => '2345678901',
                'bank_account_name' => 'Dara Sok',
                'currency' => 'KHR',
            ]
        );

        // Employee 3: IT Manager
        $employee3 = Employee::updateOrCreate(
            ['email' => 'it.manager@company.com'],
            [
                'first_name' => 'Rithy',
                'last_name' => 'Kong',
                'employee_id' => 'EMP003',
                'phone' => '012345680',
                'gender' => 'male',
                'hire_date' => '2019-03-10',
                'employment_status' => 'permanent',
                'employment_type' => 'full_time',
                'status' => 'active',
                'position_id' => 3, // IT Manager
                'department_id' => 2, // IT
                'salary' => 3000000,
            ]
        );
        $employees[] = $employee3;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee3->id],
            [
                'basic_salary' => 3000000,
                'housing_allowance' => 400000,
                'transport_allowance' => 200000,
                'meal_allowance' => 100000,
                'phone_allowance' => 80000,
                'other_allowance' => 150000,
                'dependents' => 3,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ACLEDA Bank',
                'bank_account_number' => '3456789012',
                'bank_account_name' => 'Rithy Kong',
                'currency' => 'KHR',
            ]
        );

        // Employee 4: Finance Manager
        $employee4 = Employee::updateOrCreate(
            ['email' => 'finance.manager@company.com'],
            [
                'first_name' => 'Sreymom',
                'last_name' => 'Khun',
                'employee_id' => 'EMP004',
                'phone' => '012345681',
                'gender' => 'female',
                'hire_date' => '2020-08-20',
                'employment_status' => 'permanent',
                'employment_type' => 'full_time',
                'status' => 'active',
                'position_id' => 4, // Finance Manager
                'department_id' => 3, // Finance
                'salary' => 2800000,
            ]
        );
        $employees[] = $employee4;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee4->id],
            [
                'basic_salary' => 2800000,
                'housing_allowance' => 350000,
                'transport_allowance' => 180000,
                'meal_allowance' => 90000,
                'phone_allowance' => 60000,
                'other_allowance' => 120000,
                'dependents' => 2,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ABA Bank',
                'bank_account_number' => '4567890123',
                'bank_account_name' => 'Sreymom Khun',
                'currency' => 'KHR',
            ]
        );

        // Employee 5: Marketing Executive
        $employee5 = Employee::updateOrCreate(
            ['email' => 'marketing.exec@company.com'],
            [
                'first_name' => 'Vannak',
                'last_name' => 'Chhin',
                'employee_id' => 'EMP005',
                'phone' => '012345682',
                'gender' => 'male',
                'hire_date' => '2022-01-15',
                'employment_status' => 'probation',
                'employment_type' => 'full_time',
                'status' => 'active',
                'position_id' => 5, // Marketing Executive
                'department_id' => 4, // Marketing
                'salary' => 1500000,
            ]
        );
        $employees[] = $employee5;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee5->id],
            [
                'basic_salary' => 1500000,
                'housing_allowance' => 150000,
                'transport_allowance' => 80000,
                'meal_allowance' => 50000,
                'phone_allowance' => 20000,
                'other_allowance' => 30000,
                'dependents' => 0,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ACLEDA Bank',
                'bank_account_number' => '5678901234',
                'bank_account_name' => 'Vannak Chhin',
                'currency' => 'KHR',
            ]
        );

        // Employee 6: Sales Executive (Part-time)
        $employee6 = Employee::updateOrCreate(
            ['email' => 'sales.exec@company.com'],
            [
                'first_name' => 'Chan',
                'last_name' => 'Nou',
                'employee_id' => 'EMP006',
                'phone' => '012345683',
                'gender' => 'female',
                'hire_date' => '2022-03-01',
                'employment_status' => 'contract',
                'employment_type' => 'part_time',
                'status' => 'active',
                'position_id' => 6, // Sales Executive
                'department_id' => 5, // Sales
                'salary' => 1200000,
            ]
        );
        $employees[] = $employee6;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee6->id],
            [
                'basic_salary' => 1200000,
                'housing_allowance' => 100000,
                'transport_allowance' => 60000,
                'meal_allowance' => 40000,
                'phone_allowance' => 15000,
                'other_allowance' => 20000,
                'dependents' => 1,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ABA Bank',
                'bank_account_number' => '6789012345',
                'bank_account_name' => 'Chan Nou',
                'currency' => 'KHR',
            ]
        );

        $this->command->info('✅ ' . count($employees) . ' employees created with salary settings');

        return $employees;
    }

    /**
     * Create Payroll Periods
     */
    private function createPayrollPeriods()
    {
        $payrollPeriods = [];

        // Current month - First half (1-15)
        $currentMonth = Carbon::now()->format('Y-m');
        $startDate1 = Carbon::createFromFormat('Y-m', $currentMonth)->startOfMonth();
        $endDate1 = Carbon::createFromFormat('Y-m', $currentMonth)->startOfMonth()->addDays(14);

        $payroll1 = PayrollPeriod::updateOrCreate(
            [
                'start_date' => $startDate1->format('Y-m-d'),
                'end_date' => $endDate1->format('Y-m-d'),
                'payroll_type' => 'semi_monthly',
            ],
            [
                'name' => $startDate1->format('F Y') . ' - First Half',
                'start_date' => $startDate1->format('Y-m-d'),
                'end_date' => $endDate1->format('Y-m-d'),
                'payment_date' => $endDate1->copy()->addDays(5)->format('Y-m-d'),
                'payroll_type' => 'semi_monthly',
                'payroll_cycle' => 'first',
                'cycle_number' => 1,
                'status' => 'draft',
                'notes' => 'First half payroll for ' . $startDate1->format('F Y'),
                'created_by' => 1,
            ]
        );
        $payrollPeriods[] = $payroll1;

        // Current month - Second half (16-end)
        $startDate2 = Carbon::createFromFormat('Y-m', $currentMonth)->startOfMonth()->addDays(15);
        $endDate2 = Carbon::createFromFormat('Y-m', $currentMonth)->endOfMonth();

        $payroll2 = PayrollPeriod::updateOrCreate(
            [
                'start_date' => $startDate2->format('Y-m-d'),
                'end_date' => $endDate2->format('Y-m-d'),
                'payroll_type' => 'semi_monthly',
            ],
            [
                'name' => $startDate2->format('F Y') . ' - Second Half',
                'start_date' => $startDate2->format('Y-m-d'),
                'end_date' => $endDate2->format('Y-m-d'),
                'payment_date' => $endDate2->copy()->addDays(5)->format('Y-m-d'),
                'payroll_type' => 'semi_monthly',
                'payroll_cycle' => 'second',
                'cycle_number' => 2,
                'status' => 'draft',
                'notes' => 'Second half payroll for ' . $startDate2->format('F Y'),
                'created_by' => 1,
            ]
        );
        $payrollPeriods[] = $payroll2;

        // Previous month - Full month (for monthly payroll type)
        $previousMonth = Carbon::now()->subMonth()->format('Y-m');
        $startDate3 = Carbon::createFromFormat('Y-m', $previousMonth)->startOfMonth();
        $endDate3 = Carbon::createFromFormat('Y-m', $previousMonth)->endOfMonth();

        $payroll3 = PayrollPeriod::updateOrCreate(
            [
                'start_date' => $startDate3->format('Y-m-d'),
                'end_date' => $endDate3->format('Y-m-d'),
                'payroll_type' => 'monthly',
            ],
            [
                'name' => $startDate3->format('F Y') . ' - Monthly',
                'start_date' => $startDate3->format('Y-m-d'),
                'end_date' => $endDate3->format('Y-m-d'),
                'payment_date' => $endDate3->copy()->addDays(10)->format('Y-m-d'),
                'payroll_type' => 'monthly',
                'payroll_cycle' => 'first',
                'cycle_number' => 1,
                'status' => 'paid',
                'notes' => 'Monthly payroll for ' . $startDate3->format('F Y'),
                'created_by' => 1,
                'approved_by' => 1,
                'approved_at' => Carbon::now()->subDays(5),
            ]
        );
        $payrollPeriods[] = $payroll3;

        $this->command->info('✅ ' . count($payrollPeriods) . ' payroll periods created');

        return $payrollPeriods;
    }

    /**
     * Create Payroll Items for each period
     */
    private function createPayrollItems($payrollPeriods, $employees)
    {
        $taxSettings = TaxSetting::getActive();
        $totalItems = 0;

        foreach ($payrollPeriods as $period) {
            $periodStart = Carbon::parse($period->start_date);
            $periodEnd = Carbon::parse($period->end_date);

            // Calculate working days for this period
            $workingDays = $this->calculateWorkingDays($periodStart, $periodEnd);
            $totalDaysInMonth = Carbon::parse($period->start_date)->daysInMonth;

            foreach ($employees as $employee) {
                $salarySetting = $employee->salarySetting;

                if (!$salarySetting) {
                    continue;
                }

                // Calculate prorated salary if needed
                $isProrated = false;
                $proratedDays = $workingDays;
                $actualSalary = $salarySetting->basic_salary;

                // Check if employee joined mid-period
                $joinDate = $employee->hire_date ? Carbon::parse($employee->hire_date) : null;
                if ($joinDate && $joinDate > $periodStart) {
                    $proratedDays = $this->calculateWorkingDays($joinDate, $periodEnd);
                    $isProrated = true;
                }

                // Calculate salary based on period type
                if ($isProrated) {
                    $monthlySalary = $salarySetting->basic_salary;
                    $dailyRate = $monthlySalary / $totalDaysInMonth;
                    $actualSalary = round($dailyRate * $proratedDays, 2);
                }

                $basicSalary = $actualSalary;
                $allowance = $this->calculateProratedAllowance($salarySetting, $workingDays, $totalDaysInMonth);
                $totalEarnings = $basicSalary + $allowance;

                // Calculate tax
                $tax = 0;
                if ($taxSettings && !$salarySetting->is_tax_exempt) {
                    $tax = $taxSettings->calculateTax($totalEarnings, $salarySetting->dependents);
                }

                // Calculate NSSF
                $nssf = 0;
                if ($taxSettings) {
                    $nssf = $taxSettings->calculateNSSF($basicSalary)['employee'];
                }

                $totalDeductions = $tax + $nssf;
                $netPay = $totalEarnings - $totalDeductions;

                // Create payroll item
                $payrollItem = PayrollItem::updateOrCreate(
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

                // Debug: Show what was created
                $this->command->line("   - Employee: {$employee->first_name} {$employee->last_name}, Net Pay: " . number_format($netPay, 2) . ' KHR');
            }

            // Update payroll totals
            $this->updatePayrollTotals($period);
        }

        $this->command->info('✅ ' . $totalItems . ' payroll items created');
    }

    /**
     * Calculate working days (Monday-Friday)
     */
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

    /**
     * Calculate prorated allowance
     */
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

    /**
     * Update payroll totals
     */
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
