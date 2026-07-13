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
                    'total_entitlement' => $this->calculateEntitlement($employee, $leaveType, $year),
                    'base_entitlement' => $leaveType->default_entitlement ?? 12,
                    'remaining_days' => $this->calculateEntitlement($employee, $leaveType, $year),
                    'used_days' => 0,
                    'pending_days' => 0,
                    'manual_adjustment' => 0,
                    'carry_forward' => 0,
                ]
            );

            // If balance already exists but remaining days not calculated correctly
            if (!$balance->wasRecentlyCreated) {
                $this->recalculateBalance($balance);
            }

            Log::info("✅ Balance ensured for employee {$employee->id} - {$leaveType->name} for year {$year}");
        }
    }

    /**
     * Calculate entitlement based on employee's years of service
     */
    private function calculateEntitlement(Employee $employee, LeaveType $leaveType, int $year): float
    {
        $baseEntitlement = $leaveType->default_entitlement ?? 12;

        // If it's annual leave, add extra days based on years of service
        if ($leaveType->code === 'AL' || $leaveType->code === 'Annual Leave') {
            $hireDate = Carbon::parse($employee->hire_date);
            $yearsOfService = $hireDate->diffInYears(Carbon::create($year, 1, 1));

            // Add 1 extra day for every 5 years of service
            $extraDays = floor($yearsOfService / 5);
            return $baseEntitlement + $extraDays;
        }

        return $baseEntitlement;
    }

    /**
     * Recalculate balance to ensure consistency
     */
    public function recalculateBalance(LeaveBalance $balance): void
    {
        // Calculate used days from approved leaves
        $usedDays = Leave::where('employee_id', $balance->employee_id)
            ->where('leave_type_id', $balance->leave_type_id)
            ->whereYear('start_date', $balance->year)
            ->where('status', 'approved')
            ->sum('total_days');

        // Calculate pending days from pending leaves
        $pendingDays = Leave::where('employee_id', $balance->employee_id)
            ->where('leave_type_id', $balance->leave_type_id)
            ->whereYear('start_date', $balance->year)
            ->where('status', 'pending')
            ->sum('total_days');

        $balance->used_days = (float) $usedDays;
        $balance->pending_days = (float) $pendingDays;
        $balance->remaining_days = $balance->total_entitlement - $balance->used_days - $balance->pending_days;
        $balance->save();
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

            // Recalculate remaining days
            $balance->remaining_days = (float) $balance->total_entitlement
                - (float) $balance->used_days
                - (float) $balance->pending_days;

            // Ensure remaining days is not negative
            if ($balance->remaining_days < 0) {
                Log::warning("⚠️ Negative remaining days detected for employee {$employee->id}, setting to 0");
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
     * Manual adjustment of leave balance
     */
    public function manualAdjustment(LeaveBalance $balance, float $newTotal, string $reason, int $adjustedBy): LeaveBalance
    {
        try {
            DB::beginTransaction();

            $oldRemaining = $balance->remaining_days;

            $balance->total_entitlement = $newTotal;
            $balance->manual_adjustment = $newTotal - $balance->base_entitlement;
            $balance->adjustment_reason = $reason;
            $balance->adjusted_by = $adjustedBy;
            $balance->adjusted_at = now();
            $balance->remaining_days = $newTotal - $balance->used_days - $balance->pending_days;

            // Ensure remaining days is not negative
            if ($balance->remaining_days < 0) {
                $balance->remaining_days = 0;
            }

            $balance->save();

            Log::info("✅ Manual adjustment completed", [
                'balance_id' => $balance->id,
                'employee_id' => $balance->employee_id,
                'old_remaining' => $oldRemaining,
                'new_remaining' => $balance->remaining_days,
                'adjusted_by' => $adjustedBy,
            ]);

            DB::commit();
            return $balance;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("❌ Error in manual adjustment: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process carry forward from previous year
     */
    public function processCarryForward(Employee $employee, int $fromYear, int $toYear): void
    {
        try {
            DB::beginTransaction();

            $previousBalances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', $fromYear)
                ->get();

            foreach ($previousBalances as $previousBalance) {
                // Only carry forward remaining days up to a maximum (e.g., 5 days)
                $carryForwardDays = min((float) $previousBalance->remaining_days, 5);

                if ($carryForwardDays > 0) {
                    $newBalance = LeaveBalance::where([
                        'employee_id' => $employee->id,
                        'leave_type_id' => $previousBalance->leave_type_id,
                        'year' => $toYear,
                    ])->first();

                    if ($newBalance) {
                        $newBalance->total_entitlement = (float) $newBalance->total_entitlement + $carryForwardDays;
                        $newBalance->remaining_days = (float) $newBalance->remaining_days + $carryForwardDays;
                        $newBalance->carry_forward = (float) $newBalance->carry_forward + $carryForwardDays;
                        $newBalance->save();

                        Log::info("✅ Carry forward processed", [
                            'employee_id' => $employee->id,
                            'from_year' => $fromYear,
                            'to_year' => $toYear,
                            'days' => $carryForwardDays,
                        ]);
                    }
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("❌ Error processing carry forward: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get balance summary for an employee
     */
    public function getEmployeeBalanceSummary(Employee $employee, ?int $year = null): array
    {
        $year = $year ?? date('Y');

        $balances = LeaveBalance::where('employee_id', $employee->id)
            ->where('year', $year)
            ->with('leaveType')
            ->get();

        $summary = [
            'employee_id' => $employee->id,
            'employee_name' => $employee->first_name . ' ' . $employee->last_name,
            'year' => $year,
            'total_entitlement' => 0,
            'total_used' => 0,
            'total_pending' => 0,
            'total_remaining' => 0,
            'details' => [],
        ];

        foreach ($balances as $balance) {
            $summary['total_entitlement'] += (float) $balance->total_entitlement;
            $summary['total_used'] += (float) $balance->used_days;
            $summary['total_pending'] += (float) $balance->pending_days;
            $summary['total_remaining'] += (float) $balance->remaining_days;

            $summary['details'][] = [
                'leave_type' => $balance->leaveType->name ?? 'N/A',
                'leave_code' => $balance->leaveType->code ?? 'N/A',
                'total_entitlement' => (float) $balance->total_entitlement,
                'used_days' => (float) $balance->used_days,
                'pending_days' => (float) $balance->pending_days,
                'remaining_days' => (float) $balance->remaining_days,
            ];
        }

        return $summary;
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
     * Reset balance for new year
     */
    public function resetBalanceForNewYear(Employee $employee, int $year): void
    {
        try {
            DB::beginTransaction();

            // Process carry forward from previous year
            $this->processCarryForward($employee, $year - 1, $year);

            // Ensure balance exists for new year
            $this->ensureBalanceExists($employee, $year);

            DB::commit();
            Log::info("✅ Balance reset for new year {$year} for employee {$employee->id}");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("❌ Error resetting balance for new year: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get balance history for an employee
     */
    public function getBalanceHistory(Employee $employee, int $leaveTypeId, int $year): array
    {
        $leaves = Leave::where('employee_id', $employee->id)
            ->where('leave_type_id', $leaveTypeId)
            ->whereYear('start_date', $year)
            ->orderBy('created_at', 'desc')
            ->get();

        $history = [];
        foreach ($leaves as $leave) {
            $history[] = [
                'date' => $leave->created_at->format('Y-m-d H:i:s'),
                'type' => $leave->status,
                'days' => (float) $leave->total_days,
                'start_date' => $leave->start_date,
                'end_date' => $leave->end_date,
                'reason' => $leave->reason,
                'status' => $leave->status,
            ];
        }

        return $history;
    }

    /**
     * Get all balances for a specific year
     */
    public function getAllBalancesForYear(int $year): \Illuminate\Database\Eloquent\Collection
    {
        return LeaveBalance::with(['employee', 'leaveType'])
            ->where('year', $year)
            ->get();
    }

    /**
     * Get employees with low balance
     */
    public function getLowBalanceEmployees(int $threshold = 2, ?int $year = null): array
    {
        $year = $year ?? date('Y');

        $balances = LeaveBalance::where('year', $year)
            ->where('remaining_days', '<=', $threshold)
            ->with(['employee', 'leaveType'])
            ->get();

        $result = [];
        foreach ($balances as $balance) {
            $result[] = [
                'employee_id' => $balance->employee_id,
                'employee_name' => $balance->employee->first_name . ' ' . $balance->employee->last_name,
                'leave_type' => $balance->leaveType->name ?? 'N/A',
                'remaining_days' => (float) $balance->remaining_days,
                'used_days' => (float) $balance->used_days,
                'total_entitlement' => (float) $balance->total_entitlement,
            ];
        }

        return $result;
    }

    /**
     * Bulk update balances for all employees
     */
    public function bulkUpdateBalances(int $year, float $entitlement, string $reason, int $adjustedBy): array
    {
        try {
            DB::beginTransaction();

            $employees = Employee::where('status', 'active')->get();
            $updated = 0;
            $failed = 0;

            foreach ($employees as $employee) {
                try {
                    $leaveTypes = LeaveType::where('is_active', true)->get();

                    foreach ($leaveTypes as $leaveType) {
                        $balance = LeaveBalance::where([
                            'employee_id' => $employee->id,
                            'leave_type_id' => $leaveType->id,
                            'year' => $year,
                        ])->first();

                        if ($balance) {
                            $this->manualAdjustment($balance, $entitlement, $reason, $adjustedBy);
                            $updated++;
                        }
                    }
                } catch (\Exception $e) {
                    Log::error("Failed to update balance for employee {$employee->id}: " . $e->getMessage());
                    $failed++;
                }
            }

            DB::commit();

            return [
                'total_employees' => $employees->count(),
                'updated' => $updated,
                'failed' => $failed,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("❌ Error in bulk update: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Validate if a leave can be taken
     */
    public function validateLeaveRequest(Employee $employee, int $leaveTypeId, float $days, string $startDate, string $endDate): array
    {
        $errors = [];

        // Check if employee exists
        if (!$employee) {
            $errors[] = 'Employee not found';
            return ['valid' => false, 'errors' => $errors];
        }

        // Check if leave type exists and is active
        $leaveType = LeaveType::find($leaveTypeId);
        if (!$leaveType || !$leaveType->is_active) {
            $errors[] = 'Leave type not found or inactive';
            return ['valid' => false, 'errors' => $errors];
        }

        // Check if there's sufficient balance
        if (!$this->hasSufficientBalance($employee, $leaveTypeId, $days)) {
            $available = $this->getAvailableBalance($employee, $leaveTypeId);
            $errors[] = "Insufficient balance. Available: {$available}, Requested: {$days}";
        }

        // Check if there's already a pending leave for same period
        $overlappingLeave = Leave::where('employee_id', $employee->id)
            ->where('status', 'pending')
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('start_date', [$startDate, $endDate])
                    ->orWhereBetween('end_date', [$startDate, $endDate])
                    ->orWhere(function ($q) use ($startDate, $endDate) {
                        $q->where('start_date', '<=', $startDate)
                            ->where('end_date', '>=', $endDate);
                    });
            })
            ->exists();

        if ($overlappingLeave) {
            $errors[] = 'You already have a pending leave request for this period';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }
}
