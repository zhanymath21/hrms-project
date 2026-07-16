<?php
// app/Services/Leave/LeaveBalanceService.php

namespace App\Services\Leave;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\Leave;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class LeaveBalanceService
{
    /**
     * Ensure balance exists for employee for current year
     */
    public function ensureBalanceExists(Employee $employee, ?int $year = null): void
    {
        $year = $year ?? date('Y');
        $leaveTypes = LeaveType::where('is_active', true)->get();

        foreach ($leaveTypes as $leaveType) {
            $balance = LeaveBalance::firstOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                ],
                [
                    'base_entitlement' => $this->getBaseEntitlement($leaveType),
                    'total_entitlement' => $this->calculateEntitlement($employee, $leaveType, $year),
                    'remaining_days' => $this->calculateEntitlement($employee, $leaveType, $year),
                    'used_days' => 0,
                    'pending_days' => 0,
                    'carry_forward' => 0,
                    'manual_adjustment' => 0,
                ]
            );

            Log::info("✅ Balance ensured for employee {$employee->id} - {$leaveType->name} for year {$year}");
        }
    }

    /**
     * Get base entitlement for leave type
     */
    public function getBaseEntitlement(LeaveType $leaveType): float
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

    /**
     * Calculate entitlement based on employee's years of service
     */
    public function calculateEntitlement(Employee $employee, LeaveType $leaveType, int $year): float
    {
        $baseEntitlement = $this->getBaseEntitlement($leaveType);

        if ($leaveType->code === 'AL' || $leaveType->code === 'Annual Leave') {
            $hireDate = Carbon::parse($employee->hire_date);
            $yearsOfService = $hireDate->diffInYears(Carbon::create($year, 1, 1));

            $extraDays = floor($yearsOfService / 5);

            if ($hireDate->year == $year) {
                $monthsRemaining = 12 - $hireDate->month + 1;
                $prorated = ($baseEntitlement / 12) * $monthsRemaining;
                return round($prorated + $extraDays, 1);
            }

            return $baseEntitlement + $extraDays;
        }

        $hireDate = Carbon::parse($employee->hire_date);
        if ($hireDate->year == $year) {
            $monthsRemaining = 12 - $hireDate->month + 1;
            $prorated = ($baseEntitlement / 12) * $monthsRemaining;
            return round($prorated, 1);
        }

        return $baseEntitlement;
    }

    /**
     * Calculate prorated entitlement based on hire date
     */
    public function calculateProratedEntitlement(Employee $employee, LeaveType $leaveType, int $year): float
    {
        $baseEntitlement = $this->getBaseEntitlement($leaveType);

        $hireDate = Carbon::parse($employee->hire_date);

        if ($hireDate->year == $year) {
            $monthsRemaining = 12 - $hireDate->month + 1;
            $prorated = ($baseEntitlement / 12) * $monthsRemaining;
            return round($prorated, 1);
        }

        return $baseEntitlement;
    }

    /**
     * Generate leave balance for a new employee
     */
    public function generateBalanceForNewEmployee(Employee $employee, ?int $year = null): array
    {
        $year = $year ?? date('Y');

        Log::info('🔄 Starting generateBalanceForNewEmployee', [
            'employee_id' => $employee->id,
            'employee_name' => $employee->first_name . ' ' . $employee->last_name,
            'year' => $year
        ]);

        $leaveTypes = LeaveType::where('is_active', true)->get();

        $generated = [];
        $failed = [];

        // Check if employee already has balances
        $existingBalances = LeaveBalance::where('employee_id', $employee->id)
            ->where('year', $year)
            ->count();

        if ($existingBalances > 0) {
            Log::info('⚠️ Employee already has balances', [
                'employee_id' => $employee->id,
                'count' => $existingBalances
            ]);

            return [
                'employee_id' => $employee->id,
                'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                'year' => $year,
                'status' => 'already_exists',
                'message' => 'Employee already has balances for this year',
                'generated' => [],
                'failed' => [],
            ];
        }

        foreach ($leaveTypes as $leaveType) {
            try {
                Log::info('📝 Processing leave type', [
                    'leave_type' => $leaveType->name,
                    'code' => $leaveType->code
                ]);

                $entitlement = $this->calculateProratedEntitlement($employee, $leaveType, $year);
                $baseEntitlement = $this->getBaseEntitlement($leaveType);

                Log::info('📊 Calculated entitlement', [
                    'base_entitlement' => $baseEntitlement,
                    'prorated_entitlement' => $entitlement
                ]);

                // Create new balance
                $balance = LeaveBalance::create([
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                    'base_entitlement' => $baseEntitlement,
                    'total_entitlement' => $entitlement,
                    'remaining_days' => $entitlement,
                    'used_days' => 0,
                    'pending_days' => 0,
                    'manual_adjustment' => 0,
                    'carry_forward' => 0,
                    'adjustment_reason' => 'Auto-generated for new employee',
                    'adjusted_by' => null,
                    'adjusted_at' => now(),
                ]);

                Log::info('✅ Balance created successfully', [
                    'balance_id' => $balance->id,
                    'leave_type' => $leaveType->name,
                    'entitlement' => $entitlement
                ]);

                $generated[] = [
                    'leave_type' => $leaveType->name,
                    'leave_code' => $leaveType->code,
                    'entitlement' => $entitlement,
                    'base_entitlement' => $baseEntitlement,
                    'balance_id' => $balance->id,
                ];
            } catch (\Exception $e) {
                Log::error('❌ Failed to generate balance', [
                    'employee_id' => $employee->id,
                    'leave_type' => $leaveType->name,
                    'error' => $e->getMessage(),
                ]);

                $failed[] = [
                    'leave_type' => $leaveType->name,
                    'leave_code' => $leaveType->code,
                    'error' => $e->getMessage(),
                ];
            }
        }

        $result = [
            'employee_id' => $employee->id,
            'employee_name' => $employee->first_name . ' ' . $employee->last_name,
            'employee_employee_id' => $employee->employee_id,
            'year' => $year,
            'status' => count($failed) === 0 ? 'success' : 'partial',
            'generated' => $generated,
            'failed' => $failed,
        ];

        Log::info('🏁 generateBalanceForNewEmployee completed', [
            'employee_id' => $employee->id,
            'generated' => count($generated),
            'failed' => count($failed)
        ]);

        return $result;
    }

    /**
     * Generate balances for all new employees
     */
    public function generateBalancesForNewEmployees(?int $year = null): array
    {
        $year = $year ?? date('Y');

        Log::info('🔄 Starting generateBalancesForNewEmployees', ['year' => $year]);

        $employees = Employee::where('status', 'active')
            ->whereDoesntHave('leaveBalances', function ($query) use ($year) {
                $query->where('year', $year);
            })
            ->get();

        Log::info('📊 Employees without balances', [
            'count' => $employees->count(),
            'employee_ids' => $employees->pluck('id')->toArray()
        ]);

        if ($employees->isEmpty()) {
            return [
                'year' => $year,
                'total_processed' => 0,
                'generated' => 0,
                'failed' => 0,
                'message' => 'All employees already have balances for this year',
                'results' => [],
            ];
        }

        $results = [];
        $generated = 0;
        $failed = 0;

        foreach ($employees as $employee) {
            try {
                $result = $this->generateBalanceForNewEmployee($employee, $year);
                $results[] = $result;

                if ($result['status'] === 'success') {
                    $generated++;
                } else {
                    $failed++;
                }
            } catch (\Exception $e) {
                Log::error('❌ Exception while generating balance:', [
                    'employee_id' => $employee->id,
                    'error' => $e->getMessage()
                ]);
                $failed++;
                $results[] = [
                    'employee_id' => $employee->id,
                    'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'year' => $year,
            'total_processed' => $employees->count(),
            'generated' => $generated,
            'failed' => $failed,
            'message' => "Balances generated for {$generated} employees",
            'results' => $results,
        ];
    }

    /**
     * Update balance after leave action (pending, approve, reject, cancel)
     */
    public function updateBalanceAfterLeave($employee, $leaveType, $year, $action, $days): ?LeaveBalance
    {
        try {
            DB::beginTransaction();

            $balance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year,
            ])->first();

            if (!$balance) {
                $this->ensureBalanceExists($employee, $year);
                $balance = LeaveBalance::where([
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                ])->first();
            }

            if (!$balance) {
                Log::error("❌ Balance not found for employee {$employee->id}, leave type {$leaveType->id}, year {$year}");
                DB::rollBack();
                return null;
            }

            switch ($action) {
                case 'pending':
                    $balance->pending_days = (float) $balance->pending_days + $days;
                    break;

                case 'approve':
                    $balance->pending_days = max(0, (float) $balance->pending_days - $days);
                    $balance->used_days = (float) $balance->used_days + $days;
                    break;

                case 'reject':
                case 'cancel':
                    $balance->pending_days = max(0, (float) $balance->pending_days - $days);
                    break;

                default:
                    Log::warning("⚠️ Unknown action: {$action}");
                    DB::rollBack();
                    return null;
            }

            $balance->remaining_days = (float) $balance->total_entitlement
                - (float) $balance->used_days
                - (float) $balance->pending_days;

            if ($balance->remaining_days < 0) {
                $balance->remaining_days = 0;
            }

            $balance->save();

            Log::info("✅ Balance updated after {$action}", [
                'employee_id' => $employee->id,
                'leave_type' => $leaveType->name,
                'year' => $year,
                'days' => $days,
                'new_remaining' => $balance->remaining_days,
            ]);

            DB::commit();
            return $balance;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("❌ Error updating balance after leave: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Check if employee has sufficient balance
     */
    public function hasSufficientBalance(Employee $employee, int $leaveTypeId, float $days, ?int $year = null): bool
    {
        $year = $year ?? date('Y');

        $balance = LeaveBalance::where([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveTypeId,
            'year' => $year,
        ])->first();

        if (!$balance) {
            $this->ensureBalanceExists($employee, $year);
            $balance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveTypeId,
                'year' => $year,
            ])->first();
        }

        if (!$balance) {
            return false;
        }

        return (float) $balance->remaining_days >= $days;
    }

    /**
     * Get available balance for a specific leave type
     */
    public function getAvailableBalance(Employee $employee, int $leaveTypeId, ?int $year = null): float
    {
        $year = $year ?? date('Y');

        $balance = LeaveBalance::where([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveTypeId,
            'year' => $year,
        ])->first();

        if (!$balance) {
            $this->ensureBalanceExists($employee, $year);
            $balance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveTypeId,
                'year' => $year,
            ])->first();
        }

        return $balance ? (float) $balance->remaining_days : 0;
    }

    /**
     * Get employees without balances for a specific year
     */
    public function getEmployeesWithoutBalances(int $year): \Illuminate\Database\Eloquent\Collection
    {
        return Employee::where('status', 'active')
            ->whereDoesntHave('leaveBalances', function ($query) use ($year) {
                $query->where('year', $year);
            })
            ->get(['id', 'employee_id', 'first_name', 'last_name', 'email', 'hire_date']);
    }

    /**
     * Reset balances for a specific year
     */
    public function resetBalancesForYear(int $year): array
    {
        try {
            $count = LeaveBalance::where('year', $year)->delete();

            Log::info("🗑️ Reset balances for year {$year}", ['deleted' => $count]);

            return [
                'year' => $year,
                'deleted' => $count,
                'message' => "Reset {$count} balances for year {$year}"
            ];
        } catch (\Exception $e) {
            Log::error('❌ Error resetting balances: ' . $e->getMessage());
            throw $e;
        }
    }
}