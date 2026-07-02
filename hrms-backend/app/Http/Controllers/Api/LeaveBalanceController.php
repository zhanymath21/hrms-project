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

class LeaveBalanceController extends Controller
{
    /**
     * Get my leave balance (Employee)
     * GET /api/employees/my-leave-balance
     */
    public function myBalance(Request $request): JsonResponse
    {
        try {
            Log::info('📊 myBalance endpoint called');

            $user = $request->user();

            if (!$user) {
                Log::error('User not authenticated');
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not authenticated'
                ], 401);
            }

            Log::info('User ID: ' . $user->id . ', Email: ' . $user->email);

            // Ensure leave types exist
            $this->ensureLeaveTypesExist();

            // Ensure balance exists
            $this->ensureBalanceExists($user);

            $balances = LeaveBalance::where('employee_id', $user->id)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            Log::info('Found ' . $balances->count() . ' balances');

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
     * Get employee balance by ID (Admin/HR only)
     */
    public function getEmployeeBalance(Request $request, $employeeId): JsonResponse
    {
        try {
            $user = $request->user();

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
     * Get all employees leave balances (Admin/HR only)
     */
    public function allBalances(Request $request): JsonResponse
    {
        try {
            $employees = Employee::with([
                'department:id,name',
                'leaveBalances' => function ($query) {
                    $query->where('year', date('Y'))->with('leaveType:id,name,code');
                }
            ])->where('status', 'active')->get();

            $result = $employees->map(function ($employee) {
                return [
                    'id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department->name ?? 'N/A',
                    'leave_balances' => $employee->leaveBalances->map(function ($balance) {
                        return [
                            'id' => $balance->id,
                            'leave_type' => $balance->leaveType->name ?? 'Unknown',
                            'leave_code' => $balance->leaveType->code ?? 'N/A',
                            'total_entitlement' => (float) ($balance->total_entitlement ?? 0),
                            'used_days' => (float) ($balance->used_days ?? 0),
                            'pending_days' => (float) ($balance->pending_days ?? 0),
                            'remaining_days' => (float) ($balance->remaining_days ?? 0),
                        ];
                    }),
                ];
            });

            return response()->json([
                'status' => 'success',
                'message' => 'All balances fetched',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching all balances: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch all balances: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate balance for employee
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            $employeeId = $request->employee_id;

            if (!$employeeId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee ID is required'
                ], 422);
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

            return response()->json([
                'status' => 'success',
                'message' => 'Balance generated successfully for ' . $employee->first_name,
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate balances for all employees
     */
    public function generateAllBalances(Request $request): JsonResponse
    {
        try {
            $employees = Employee::where('status', 'active')->get();
            $count = 0;

            $this->ensureLeaveTypesExist();

            foreach ($employees as $employee) {
                try {
                    $this->ensureBalanceExists($employee);
                    $count++;
                } catch (\Exception $e) {
                    Log::error('Failed for employee ' . $employee->id . ': ' . $e->getMessage());
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => "Balance generated for {$count} employees",
                'data' => ['processed' => $count, 'total' => $employees->count()]
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating all balances: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate all balances: ' . $e->getMessage()
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

        $baseEntitlement = $leaveType->days_per_year;

        if ($hireDate->year == $year && $hireDate->month > 1) {
            $monthsWorked = 12 - $hireDate->month + 1;
            $baseEntitlement = round(($baseEntitlement / 12) * $monthsWorked, 2);
        }

        $seniorityBonus = 0;
        if ($leaveType->code === 'AL') {
            if ($yearsOfService >= 6) $seniorityBonus = 2;
            elseif ($yearsOfService >= 3) $seniorityBonus = 1;
        }

        $totalEntitlement = $baseEntitlement + $seniorityBonus;

        LeaveBalance::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year,
            ],
            [
                'base_entitlement' => $baseEntitlement,
                'seniority_bonus' => $seniorityBonus,
                'carry_forward' => 0,
                'replacement_days' => 0,
                'manual_adjustment' => 0,
                'total_entitlement' => $totalEntitlement,
                'used_days' => 0,
                'pending_days' => 0,
                'remaining_days' => $totalEntitlement,
            ]
        );
    }
}