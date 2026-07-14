<?php
// app/Console/Commands/UpdateCarryForward.php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UpdateCarryForward extends Command
{
    protected $signature = 'leave:update-carry-forward
                            {--year= : Year to process (default: current year)}
                            {--employee= : Specific employee ID to update}
                            {--force : Force update even if already set}';

    protected $description = 'Update carry forward values for employees';

    public function handle()
    {
        $year = $this->option('year') ?? date('Y');
        $employeeId = $this->option('employee');
        $force = $this->option('force');

        $this->info('🔄 Updating carry forward values...');
        $this->info("Year: {$year}");
        $this->info("Force: " . ($force ? 'Yes' : 'No'));

        // Get employees
        $query = Employee::where('status', 'active');
        if ($employeeId) {
            $query->where('id', $employeeId);
        }
        $employees = $query->get();

        if ($employees->isEmpty()) {
            $this->error('No employees found!');
            return 1;
        }

        $this->info("Found {$employees->count()} employees to process");
        $updated = 0;
        $skipped = 0;
        $failed = 0;

        $bar = $this->output->createProgressBar($employees->count());

        foreach ($employees as $employee) {
            try {
                $employeeUpdated = false;

                // Get previous year balances
                $previousYearBalances = LeaveBalance::where('employee_id', $employee->id)
                    ->where('year', $year - 1)
                    ->get();

                // Get current year balances
                $currentYearBalances = LeaveBalance::where('employee_id', $employee->id)
                    ->where('year', $year)
                    ->get();

                foreach ($currentYearBalances as $currentBalance) {
                    $leaveType = LeaveType::find($currentBalance->leave_type_id);

                    // Check if this leave type allows carry forward
                    if (!$leaveType || !$leaveType->allow_carry_forward) {
                        continue;
                    }

                    // Find previous year balance for same leave type
                    $previousBalance = $previousYearBalances->firstWhere('leave_type_id', $currentBalance->leave_type_id);

                    if (!$previousBalance) {
                        continue;
                    }

                    // Calculate carry forward (max 6 days)
                    $maxCarryForward = $leaveType->max_carry_forward_days ?? 6;
                    $carryForwardAmount = min($previousBalance->remaining_days ?? 0, $maxCarryForward);

                    // Only update if value is different or forced
                    if ($force || $currentBalance->carry_forward != $carryForwardAmount) {
                        $oldValue = $currentBalance->carry_forward;
                        $currentBalance->carry_forward = $carryForwardAmount;

                        // Update total entitlement to include carry forward
                        // $currentBalance->total_entitlement = $currentBalance->base_entitlement + $carryForwardAmount;
                        // $currentBalance->remaining_days = $currentBalance->total_entitlement - $currentBalance->used_days - $currentBalance->pending_days;

                        $currentBalance->save();

                        $employeeUpdated = true;
                        $this->line("\n✅ Updated {$employee->first_name} {$employee->last_name} - {$leaveType->name}: CF {$oldValue} → {$carryForwardAmount} days");
                    }
                }

                if ($employeeUpdated) {
                    $updated++;
                } else {
                    $skipped++;
                }
            } catch (\Exception $e) {
                $failed++;
                $this->error("\n❌ Failed for employee {$employee->id}: " . $e->getMessage());
                Log::error("Failed to update carry forward for employee {$employee->id}: " . $e->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();

        $this->newLine(2);
        $this->info("📊 Summary:");
        $this->info("   ✅ Updated: {$updated}");
        $this->info("   ⏭️  Skipped: {$skipped}");
        $this->info("   ❌ Failed: {$failed}");

        return 0;
    }
}
