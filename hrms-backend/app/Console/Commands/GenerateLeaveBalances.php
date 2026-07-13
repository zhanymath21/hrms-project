<?php
// app/Console/Commands/GenerateLeaveBalances.php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Services\Leave\LeaveBalanceService;
use Illuminate\Console\Command;

class GenerateLeaveBalances extends Command
{
    protected $signature = 'leave:generate-balances {--employee_id= : Generate for specific employee}';
    protected $description = 'Generate leave balances for employees';

    protected LeaveBalanceService $balanceService;

    public function __construct(LeaveBalanceService $balanceService)
    {
        parent::__construct();
        $this->balanceService = $balanceService;
    }

    public function handle()
    {
        $employeeId = $this->option('employee_id');

        if ($employeeId) {
            $employee = Employee::find($employeeId);
            if (!$employee) {
                $this->error('Employee not found!');
                return 1;
            }
            $this->balanceService->ensureBalanceExists($employee);
            $this->info('✅ Balance generated for: ' . $employee->first_name . ' ' . $employee->last_name);
            return 0;
        }

        $employees = Employee::where('status', 'active')->get();

        if ($employees->isEmpty()) {
            $this->error('No active employees found!');
            return 1;
        }

        $this->info('Generating balances for ' . $employees->count() . ' employees...');

        $bar = $this->output->createProgressBar($employees->count());
        $bar->start();

        foreach ($employees as $employee) {
            try {
                $this->balanceService->ensureBalanceExists($employee);
            } catch (\Exception $e) {
                $this->error('Failed for ' . $employee->first_name . ': ' . $e->getMessage());
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('✅ Balances generated successfully!');

        return 0;
    }
}
