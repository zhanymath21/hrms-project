<?php
// app/Console/Commands/GenerateLeaveBalances.php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class GenerateLeaveBalances extends Command
{
    protected $signature = 'leave:generate-balances {--employee_id= : Generate for specific employee}';
    protected $description = 'Generate leave balances for employees';

    public function handle()
    {
        $employeeId = $this->option('employee_id');

        if ($employeeId) {
            $this->generateForEmployee($employeeId);
            return 0;
        }

        $this->generateForAllEmployees();
        return 0;
    }

    private function generateForEmployee(int $employeeId)
    {
        $employee = Employee::find($employeeId);

        if (!$employee) {
            $this->error('Employee not found!');
            return;
        }

        $this->info('Generating balance for: ' . $employee->first_name . ' ' . $employee->last_name);
        $this->createBalanceForEmployee($employee);
        $this->info('✅ Balance generated successfully!');
    }

    private function generateForAllEmployees()
    {
        $employees = Employee::where('status', 'active')->get();

        if ($employees->isEmpty()) {
            $this->error('No active employees found!');
            return;
        }

        $this->info('Generating balances for ' . $employees->count() . ' employees...');

        $bar = $this->output->createProgressBar($employees->count());
        $bar->start();

        foreach ($employees as $employee) {
            try {
                $this->createBalanceForEmployee($employee);
            } catch (\Exception $e) {
                $this->error('Failed for ' . $employee->first_name . ': ' . $e->getMessage());
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('✅ Balances generated successfully!');
    }

    private function createBalanceForEmployee(Employee $employee)
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
                $this->createBalance($employee, $leaveType, $currentYear);
            }
        }
    }

    private function createBalance(Employee $employee, LeaveType $leaveType, int $year)
    {
        $yearsOfService = Carbon::parse($employee->hire_date)->diffInYears(Carbon::now());
        $hireDate = Carbon::parse($employee->hire_date);

        $baseEntitlement = $leaveType->days_per_year;

        if ($hireDate->year == $year && $hireDate->month > 1) {
            $monthsWorked = 12 - $hireDate->month + 1;
            $baseEntitlement = round(($baseEntitlement / 12) * $monthsWorked, 2);
        }

        $seniorityBonus = 0;
        if ($leaveType->code === 'AL') {
            if ($yearsOfService >= 6) $seniorityBonus = 2;
            elseif ($yearsOfService >= 3) $seniorityBonus = 1;
        }

        $totalEntitlement = $baseEntitlement + $seniorityBonus;

        LeaveBalance::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year,
            ],
            [
                'base_entitlement' => $baseEntitlement,
                'seniority_bonus' => $seniorityBonus,
                'carry_forward' => 0,
                'replacement_days' => 0,
                'manual_adjustment' => 0,
                'total_entitlement' => $totalEntitlement,
                'used_days' => 0,
                'pending_days' => 0,
                'remaining_days' => $totalEntitlement,
            ]
        );
    }
}