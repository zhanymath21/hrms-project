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
                    'base_entitlement' => $leaveType->default_entitlement ?? 12,
                    'total_entitlement' => $leaveType->default_entitlement ?? 12,
                    'remaining_days' => $leaveType->default_entitlement ?? 12,
                    'used_days' => 0,
                    'pending_days' => 0,
                ]
            );

            Log::info("✅ Balance ensured for employee {$employee->id} - {$leaveType->name} for year {$year}");
        }
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
                    Log::warning("⚠️ Unknown action: {$action}");
                    DB::rollBack();
                    return null;
            }

            // Recalculate remaining days
            $balance->remaining_days = $balance->total_entitlement - $balance->used_days - $balance->pending_days;

            // Ensure remaining days is not negative
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

        return $balance->remaining_days >= $days;
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

        return $balance ? $balance->remaining_days : 0;
    }
}