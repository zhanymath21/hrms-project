<?php
// app/Http/Controllers/Api/LeaveBalanceController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Services\Leave\LeaveBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class LeaveBalanceController extends Controller
{
    protected LeaveBalanceService $balanceService;

    public function __construct(LeaveBalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    /**
     * Get my leave balance
     */
    public function myBalance(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
            }

            $employee = Employee::where('email', $user->email)->first();
            if (!$employee) {
                return response()->json(['status' => 'error', 'message' => 'Employee not found'], 404);
            }

            $this->balanceService->ensureBalanceExists($employee);

            $balances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'balances' => $balances,
                    'employee' => [
                        'id' => $employee->id,
                        'name' => $employee->first_name . ' ' . $employee->last_name,
                        'employee_id' => $employee->employee_id,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in myBalance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all employees leave balances
     */
    public function allBalances(Request $request): JsonResponse
    {
        try {
            $employees = Employee::with([
                'leaveBalances' => function ($query) {
                    $query->where('year', date('Y'))->with('leaveType');
                },
                'department'
            ])->where('status', 'active')->get();

            $result = $employees->map(function ($employee) {
                $balances = [];
                foreach ($employee->leaveBalances as $balance) {
                    $balances[] = [
                        'id' => $balance->id,
                        'leave_type' => $balance->leaveType->name ?? 'N/A',
                        'leave_code' => $balance->leaveType->code ?? 'N/A',
                        'total_entitlement' => (float) $balance->total_entitlement,
                        'used_days' => (float) $balance->used_days,
                        'pending_days' => (float) $balance->pending_days,
                        'remaining_days' => (float) $balance->remaining_days,
                        'carry_forward' => (float) ($balance->carry_forward ?? 0),
                    ];
                }

                return [
                    'id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department->name ?? 'N/A',
                    'leave_balances' => $balances,
                    'summary' => [
                        'total_entitlement' => array_sum(array_column($balances, 'total_entitlement')),
                        'used_days' => array_sum(array_column($balances, 'used_days')),
                        'pending_days' => array_sum(array_column($balances, 'pending_days')),
                        'remaining_days' => array_sum(array_column($balances, 'remaining_days')),
                        'total_carry_forward' => array_sum(array_column($balances, 'carry_forward')),
                    ],
                ];
            });

            return response()->json([
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in allBalances: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balances: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employees without balances
     */
    public function getEmployeesWithoutBalances(Request $request): JsonResponse
    {
        try {
            $year = $request->input('year', date('Y'));

            $employees = Employee::where('status', 'active')->get();

            $employeesWithoutBalances = $employees->filter(function ($employee) use ($year) {
                return !LeaveBalance::where('employee_id', $employee->id)
                    ->where('year', $year)
                    ->exists();
            });

            return response()->json([
                'status' => 'success',
                'data' => [
                    'year' => $year,
                    'total' => $employeesWithoutBalances->count(),
                    'employees' => $employeesWithoutBalances->map(function ($employee) {
                        return [
                            'id' => $employee->id,
                            'employee_id' => $employee->employee_id,
                            'first_name' => $employee->first_name,
                            'last_name' => $employee->last_name,
                            'email' => $employee->email,
                            'hire_date' => $employee->hire_date,
                        ];
                    }),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getEmployeesWithoutBalances: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch employees: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate balances for all new employees
     */
    public function generateForNewEmployees(Request $request): JsonResponse
    {
        try {
            $year = $request->input('year', date('Y'));
            $result = $this->balanceService->generateBalancesForNewEmployees($year);

            return response()->json([
                'status' => 'success',
                'message' => $result['message'],
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in generateForNewEmployees: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate balances: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate balance for specific employee
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employees,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $employee = Employee::find($request->employee_id);
            $year = $request->input('year', date('Y'));

            $result = $this->balanceService->generateBalanceForNewEmployee($employee, $year);

            return response()->json([
                'status' => 'success',
                'message' => 'Balance generated successfully',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in generateBalance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update balance
     */
    public function updateBalance(Request $request, $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'total_entitlement' => 'required|numeric|min:0',
                'adjustment_reason' => 'required|string|min:5',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $balance = LeaveBalance::find($id);
            if (!$balance) {
                return response()->json(['status' => 'error', 'message' => 'Balance not found'], 404);
            }

            $balance->total_entitlement = $request->total_entitlement;
            $balance->adjustment_reason = $request->adjustment_reason;
            $balance->adjusted_by = $request->user()->id;
            $balance->adjusted_at = now();
            $balance->remaining_days = $balance->total_entitlement - $balance->used_days - $balance->pending_days;
            if ($balance->remaining_days < 0) {
                $balance->remaining_days = 0;
            }
            $balance->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Balance updated successfully',
                'data' => $balance,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in updateBalance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update carry forward
     */
    public function updateCarryForward(Request $request, $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'carry_forward' => 'required|numeric|min:0|max:6',
                'adjustment_reason' => 'required|string|min:5',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $balance = LeaveBalance::find($id);
            if (!$balance) {
                return response()->json(['status' => 'error', 'message' => 'Balance not found'], 404);
            }

            $balance->carry_forward = $request->carry_forward;
            $balance->total_entitlement = $balance->base_entitlement + $request->carry_forward;
            $balance->remaining_days = $balance->total_entitlement - $balance->used_days - $balance->pending_days;
            if ($balance->remaining_days < 0) {
                $balance->remaining_days = 0;
            }
            $balance->adjustment_reason = $request->adjustment_reason;
            $balance->adjusted_by = $request->user()->id;
            $balance->adjusted_at = now();
            $balance->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Carry forward updated successfully',
                'data' => $balance,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in updateCarryForward: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update carry forward: ' . $e->getMessage()
            ], 500);
        }
    }
}