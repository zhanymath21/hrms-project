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
     * Ensure balance exists for employee
     */
    public function ensureBalanceExists(Employee $employee, ?int $year = null): void
    {
        $year = $year ?? date('Y');
        $leaveTypes = LeaveType::where('is_active', true)->get();

        foreach ($leaveTypes as $leaveType) {
            LeaveBalance::firstOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                ],
                [
                    'base_entitlement' => 12,
                    'total_entitlement' => 12,
                    'remaining_days' => 12,
                    'used_days' => 0,
                    'pending_days' => 0,
                    'carry_forward' => 0,
                    'manual_adjustment' => 0,
                ]
            );
        }
    }

    /**
     * Generate balance for a new employee
     */
    public function generateBalanceForNewEmployee(Employee $employee, ?int $year = null): array
    {
        $year = $year ?? date('Y');
        $leaveTypes = LeaveType::where('is_active', true)->get();

        $generated = [];
        $failed = [];

        // Check if employee already has balances
        $existingBalances = LeaveBalance::where('employee_id', $employee->id)
            ->where('year', $year)
            ->count();

        if ($existingBalances > 0) {
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
                // Set entitlement based on leave type
                $entitlement = 12; // default
                if ($leaveType->code === 'AL') $entitlement = 18;
                if ($leaveType->code === 'SL') $entitlement = 12;
                if ($leaveType->code === 'SPL') $entitlement = 7;

                $balance = LeaveBalance::create([
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                    'base_entitlement' => $entitlement,
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

                $generated[] = [
                    'leave_type' => $leaveType->name,
                    'leave_code' => $leaveType->code,
                    'entitlement' => $entitlement,
                    'balance_id' => $balance->id,
                ];
            } catch (\Exception $e) {
                $failed[] = [
                    'leave_type' => $leaveType->name,
                    'leave_code' => $leaveType->code,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'employee_id' => $employee->id,
            'employee_name' => $employee->first_name . ' ' . $employee->last_name,
            'employee_employee_id' => $employee->employee_id,
            'year' => $year,
            'status' => count($failed) === 0 ? 'success' : 'partial',
            'generated' => $generated,
            'failed' => $failed,
        ];
    }

    /**
     * Generate balances for all new employees
     */
    public function generateBalancesForNewEmployees(?int $year = null): array
    {
        $year = $year ?? date('Y');

        $employees = Employee::where('status', 'active')
            ->whereDoesntHave('leaveBalances', function ($query) use ($year) {
                $query->where('year', $year);
            })
            ->get();

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
            $result = $this->generateBalanceForNewEmployee($employee, $year);
            $results[] = $result;
            if ($result['status'] === 'success') {
                $generated++;
            } else {
                $failed++;
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
     * Update balance after leave action
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
                DB::rollBack();
                return null;
            }

            switch ($action) {
                case 'pending':
                    $balance->pending_days += $days;
                    break;
                case 'approve':
                    $balance->pending_days = max(0, $balance->pending_days - $days);
                    $balance->used_days += $days;
                    break;
                case 'reject':
                case 'cancel':
                    $balance->pending_days = max(0, $balance->pending_days - $days);
                    break;
                default:
                    DB::rollBack();
                    return null;
            }

            $balance->remaining_days = $balance->total_entitlement - $balance->used_days - $balance->pending_days;
            if ($balance->remaining_days < 0) {
                $balance->remaining_days = 0;
            }

            $balance->save();
            DB::commit();
            return $balance;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating balance: ' . $e->getMessage());
            return null;
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

        return $balance->remaining_days >= $days;
    }
}