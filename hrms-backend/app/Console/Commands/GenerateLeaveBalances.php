<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Http\Controllers\Api\LeaveController;
use Illuminate\Console\Command;

class GenerateLeaveBalances extends Command
{
    protected $signature = 'leave:generate-balances {--employee= : Generate for specific employee}';
    protected $description = 'Generate leave balances for employees';

    public function handle()
    {
        $employeeId = $this->option('employee');
        $leaveController = app()->make(LeaveController::class);

        if ($employeeId) {
            $employee = Employee::find($employeeId);
            if ($employee) {
                $leaveController->generateBalances($employee);
                $this->info("Balance generated for employee: {$employee->first_name} {$employee->last_name}");
            }
        } else {
            $employees = Employee::where('status', 'active')->get();
            foreach ($employees as $employee) {
                $leaveController->generateBalances($employee);
                $this->info("Balance generated for: {$employee->first_name} {$employee->last_name}");
            }
            $this->info("Balances generated for {$employees->count()} employees!");
        }
    }
}
