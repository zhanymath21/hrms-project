<?php
// app/Http/Controllers/Api/LeaveBalanceController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class LeaveBalanceController extends Controller
{
    /**
     * Get my leave balance (Employee)
     * GET /api/employees/my-leave-balance
     */
    public function myBalance(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                Log::error('User not authenticated');
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not authenticated'
                ], 401);
            }

            Log::info('Fetching balance for user: ' . $user->id . ' - ' . $user->email);

            // Ensure leave types exist
            $this->ensureLeaveTypesExist();

            // Ensure balance exists
            $this->ensureBalanceExists($user);

            $balances = LeaveBalance::where('employee_id', $user->id)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            Log::info('Found ' . $balances->count() . ' balances for user ' . $user->id);

            $yearsOfService = Carbon::parse($user->hire_date)->diffInYears(Carbon::now());

            $result = [
                'balances' => $balances->map(function ($balance) use ($yearsOfService) {
                    return [
                        'id' => $balance->id,
                        'leave_type_id' => $balance->leave_type_id,
                        'leave_type' => $balance->leaveType->name ?? 'Unknown',
                        'leave_code' => $balance->leaveType->code ?? 'N/A',
                        'base_entitlement' => (float) ($balance->base_entitlement ?? 0),
                        'seniority_bonus' => (float) ($balance->seniority_bonus ?? 0),
                        'carry_forward' => (float) ($balance->carry_forward ?? 0),
                        'replacement_days' => (float) ($balance->replacement_days ?? 0),
                        'manual_adjustment' => (float) ($balance->manual_adjustment ?? 0),
                        'total_entitlement' => (float) ($balance->total_entitlement ?? 0),
                        'used_days' => (float) ($balance->used_days ?? 0),
                        'pending_days' => (float) ($balance->pending_days ?? 0),
                        'remaining_days' => (float) ($balance->remaining_days ?? 0),
                        'years_of_service' => $yearsOfService,
                    ];
                }),
                'employee' => [
                    'id' => $user->id,
                    'name' => $user->first_name . ' ' . $user->last_name,
                    'employee_id' => $user->employee_id,
                    'hire_date' => $user->hire_date,
                    'years_of_service' => $yearsOfService,
                ],
            ];

            return response()->json([
                'status' => 'success',
                'message' => 'My leave balance fetched',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching my balance: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ensure leave types exist
     */
    private function ensureLeaveTypesExist(): void
    {
        $count = LeaveType::count();

        if ($count === 0) {
            Log::info('Creating default leave types');

            $defaultTypes = [
                ['code' => 'AL', 'name' => 'Annual Leave', 'days_per_year' => 12, 'is_paid' => true, 'allow_carry_forward' => true, 'max_carry_forward_days' => 6, 'is_active' => true],
                ['code' => 'SL', 'name' => 'Sick Leave', 'days_per_year' => 14, 'is_paid' => true, 'allow_carry_forward' => false, 'max_carry_forward_days' => 0, 'is_active' => true],
                ['code' => 'SPL', 'name' => 'Special Leave', 'days_per_year' => 3, 'is_paid' => true, 'allow_carry_forward' => false, 'max_carry_forward_days' => 0, 'is_active' => true],
                ['code' => 'UL', 'name' => 'Unpaid Leave', 'days_per_year' => 0, 'is_paid' => false, 'allow_carry_forward' => false, 'max_carry_forward_days' => 0, 'is_active' => true],
            ];

            foreach ($defaultTypes as $type) {
                LeaveType::create($type);
            }
        }
    }

    /**
     * Ensure leave balance exists for employee
     */
    private function ensureBalanceExists(Employee $employee): void
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
                Log::info('Creating balance for employee ' . $employee->id . ' - ' . $leaveType->code);
                $this->createBalance($employee, $leaveType, $currentYear);
            }
        }
    }

    /**
     * Create balance for employee
     */
    private function createBalance(Employee $employee, LeaveType $leaveType, int $year): void
    {
        $yearsOfService = Carbon::parse($employee->hire_date)->diffInYears(Carbon::now());
        $hireDate = Carbon::parse($employee->hire_date);

        // Base entitlement
        $baseEntitlement = $leaveType->days_per_year;

        // Prorata for new employees
        if ($hireDate->year == $year && $hireDate->month > 1) {
            $monthsWorked = 12 - $hireDate->month + 1;
            $baseEntitlement = round(($baseEntitlement / 12) * $monthsWorked, 2);
        }

        // Seniority bonus for Annual Leave
        $seniorityBonus = 0;
        if ($leaveType->code === 'AL') {
            if ($yearsOfService >= 6) {
                $seniorityBonus = 2;
            } elseif ($yearsOfService >= 3) {
                $seniorityBonus = 1;
            }
        }

        // Carry forward from previous year
        $carryForward = 0;
        if ($leaveType->code === 'AL' && $leaveType->allow_carry_forward) {
            $previousBalance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year - 1,
            ])->first();

            if ($previousBalance && $previousBalance->remaining_days > 0) {
                $carryForward = min($previousBalance->remaining_days, $leaveType->max_carry_forward_days);
            }
        }

        $totalEntitlement = $baseEntitlement + $seniorityBonus + $carryForward;

        LeaveBalance::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year,
            ],
            [
                'base_entitlement' => $baseEntitlement,
                'seniority_bonus' => $seniorityBonus,
                'carry_forward' => $carryForward,
                'replacement_days' => 0,
                'manual_adjustment' => 0,
                'total_entitlement' => $totalEntitlement,
                'used_days' => 0,
                'pending_days' => 0,
                'remaining_days' => $totalEntitlement,
            ]
        );
    }

    /**
     * Get employee balance by ID (Admin/HR only)
     * GET /api/employees/{employeeId}/leave-balance
     */
    public function getEmployeeBalance(Request $request, $employeeId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Only Admin/HR can view other employee balances'
                ], 403);
            }

            $employee = Employee::find($employeeId);
            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found'
                ], 404);
            }

            $this->ensureLeaveTypesExist();
            $this->ensureBalanceExists($employee);

            $balances = LeaveBalance::where('employee_id', $employeeId)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            $yearsOfService = Carbon::parse($employee->hire_date)->diffInYears(Carbon::now());

            $result = [
                'balances' => $balances->map(function ($balance) use ($yearsOfService) {
                    return [
                        'id' => $balance->id,
                        'leave_type_id' => $balance->leave_type_id,
                        'leave_type' => $balance->leaveType->name ?? 'Unknown',
                        'leave_code' => $balance->leaveType->code ?? 'N/A',
                        'base_entitlement' => (float) ($balance->base_entitlement ?? 0),
                        'seniority_bonus' => (float) ($balance->seniority_bonus ?? 0),
                        'carry_forward' => (float) ($balance->carry_forward ?? 0),
                        'replacement_days' => (float) ($balance->replacement_days ?? 0),
                        'manual_adjustment' => (float) ($balance->manual_adjustment ?? 0),
                        'total_entitlement' => (float) ($balance->total_entitlement ?? 0),
                        'used_days' => (float) ($balance->used_days ?? 0),
                        'pending_days' => (float) ($balance->pending_days ?? 0),
                        'remaining_days' => (float) ($balance->remaining_days ?? 0),
                        'years_of_service' => $yearsOfService,
                    ];
                }),
                'employee' => [
                    'id' => $employee->id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'employee_id' => $employee->employee_id,
                    'department' => $employee->department->name ?? 'N/A',
                    'hire_date' => $employee->hire_date,
                    'years_of_service' => $yearsOfService,
                ],
            ];

            return response()->json([
                'status' => 'success',
                'message' => 'Employee balance fetched',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching employee balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch employee balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if user is Admin or HR
     */
    private function isAdminOrHR($user): bool
    {
        if (!$user || !$user->position) {
            return false;
        }

        $adminPositions = ['HR Manager', 'HR Officer', 'HR Assistant', 'Admin', 'System Admin'];
        return in_array($user->position->title ?? '', $adminPositions);
    }
}