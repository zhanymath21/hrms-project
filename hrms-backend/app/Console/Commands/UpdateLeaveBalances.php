<?php
// app/Console/Commands/UpdateLeaveBalances.php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Services\Leave\LeaveBalanceService;
use Illuminate\Console\Command;

class UpdateLeaveBalances extends Command
{
    protected $signature = 'leave:update-balances
                            {--employee= : Specific employee ID to update}
                            {--year= : Year to update (default: current year)}
                            {--force : Force update even if balance exists}';

    protected $description = 'Update leave balances with correct entitlements';

    protected LeaveBalanceService $balanceService;

    public function __construct(LeaveBalanceService $balanceService)
    {
        parent::__construct();
        $this->balanceService = $balanceService;
    }

    public function handle()
    {
        $year = $this->option('year') ?? date('Y');
        $employeeId = $this->option('employee');
        $force = $this->option('force');

        $this->info('🔄 Updating leave balances...');
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
                $leaveTypes = LeaveType::where('is_active', true)->get();
                $employeeUpdated = false;

                foreach ($leaveTypes as $leaveType) {
                    $balance = LeaveBalance::where([
                        'employee_id' => $employee->id,
                        'leave_type_id' => $leaveType->id,
                        'year' => $year,
                    ])->first();

                    // Calculate correct entitlement
                    $correctEntitlement = $this->balanceService->calculateProratedEntitlement($employee, $leaveType, $year);

                    if ($balance) {
                        if ($force || $balance->total_entitlement != $correctEntitlement) {
                            $oldEntitlement = $balance->total_entitlement;
                            $balance->total_entitlement = $correctEntitlement;
                            $balance->base_entitlement = $this->getBaseEntitlement($leaveType);
                            $balance->remaining_days = $correctEntitlement - $balance->used_days - $balance->pending_days;
                            if ($balance->remaining_days < 0) {
                                $balance->remaining_days = 0;
                            }
                            $balance->adjustment_reason = "Auto-updated from {$oldEntitlement} to {$correctEntitlement} days";
                            $balance->adjusted_by = 1;
                            $balance->adjusted_at = now();
                            $balance->save();

                            $employeeUpdated = true;
                            $this->line("\n✅ Updated {$employee->first_name} {$employee->last_name} - {$leaveType->name}: {$oldEntitlement} → {$correctEntitlement} days");
                        }
                    } else {
                        // Create new balance if doesn't exist
                        $this->balanceService->generateBalanceForNewEmployee($employee, $year);
                        $employeeUpdated = true;
                        $this->line("\n✅ Created balance for {$employee->first_name} {$employee->last_name} - {$leaveType->name}: {$correctEntitlement} days");
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

    private function getBaseEntitlement(LeaveType $leaveType): float
    {
        $defaultEntitlements = [
            'AL' => 18,
            'SL' => 12,
            'SPL' => 7,
            'ML' => 3,
            'BL' => 5,
            'CL' => 2,
        ];

        if ($leaveType->default_entitlement) {
            return (float) $leaveType->default_entitlement;
        }

        return $defaultEntitlements[$leaveType->code] ?? 12;
    }
}
