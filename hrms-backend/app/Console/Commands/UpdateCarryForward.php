<?php
// app/Console/Commands/UpdateCarryForward.php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Illuminate\Console\Command;

class UpdateCarryForward extends Command
{
    protected $signature = 'leave:update-carry-forward
                            {--year= : Year to process}
                            {--employee= : Specific employee ID}
                            {--force : Force update}';

    protected $description = 'Update carry forward values for employees';

    public function handle()
    {
        $year = $this->option('year') ?? date('Y');
        $employeeId = $this->option('employee');
        $force = $this->option('force');

        $this->info("🔄 Updating carry forward for year: {$year}");

        $query = Employee::where('status', 'active');
        if ($employeeId) {
            $query->where('id', $employeeId);
        }
        $employees = $query->get();

        if ($employees->isEmpty()) {
            $this->error('No employees found!');
            return 1;
        }

        $updated = 0;
        $bar = $this->output->createProgressBar($employees->count());

        foreach ($employees as $employee) {
            // Get previous year balances
            $previousBalances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', $year - 1)
                ->get();

            // Get current year balances
            $currentBalances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', $year)
                ->get();

            foreach ($currentBalances as $currentBalance) {
                $leaveType = LeaveType::find($currentBalance->leave_type_id);

                if (!$leaveType || !$leaveType->allow_carry_forward) {
                    continue;
                }

                $previousBalance = $previousBalances->firstWhere('leave_type_id', $currentBalance->leave_type_id);

                if (!$previousBalance) {
                    continue;
                }

                $maxCarryForward = $leaveType->max_carry_forward_days ?? 6;
                $carryForwardAmount = min($previousBalance->remaining_days ?? 0, $maxCarryForward);

                if ($force || $currentBalance->carry_forward != $carryForwardAmount) {
                    $currentBalance->carry_forward = $carryForwardAmount;
                    $currentBalance->total_entitlement = $currentBalance->base_entitlement + $carryForwardAmount;
                    $currentBalance->remaining_days = $currentBalance->total_entitlement - $currentBalance->used_days - $currentBalance->pending_days;
                    $currentBalance->save();
                    $updated++;
                }
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("✅ Updated {$updated} balances with carry forward!");

        return 0;
    }
}
