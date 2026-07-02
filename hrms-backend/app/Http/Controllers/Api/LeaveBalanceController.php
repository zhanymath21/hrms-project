<?php
// app/Http/Controllers/Api/LeaveBalanceController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Services\Leave\LeaveBalanceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LeaveBalanceController extends Controller
{
    protected LeaveBalanceService $balanceService;

    public function __construct(LeaveBalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    /**
     * Get my leave balance (Employee)
     * GET /api/employees/my-leave-balance
     */
    public function myBalance(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not authenticated'
                ], 401);
            }

            $this->balanceService->ensureBalanceExists($user);

            $balances = LeaveBalance::where('employee_id', $user->id)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            $result = [
                'balances' => $balances->map(function ($balance) {
                    return [
                        'id' => $balance->id,
                        'leave_type_id' => $balance->leave_type_id,
                        'leave_type' => $balance->leaveType->name ?? 'Unknown',
                        'leave_code' => $balance->leaveType->code ?? 'N/A',
                        'total_entitlement' => (float) ($balance->total_entitlement ?? 0),
                        'used_days' => (float) ($balance->used_days ?? 0),
                        'pending_days' => (float) ($balance->pending_days ?? 0),
                        'remaining_days' => (float) ($balance->remaining_days ?? 0),
                    ];
                }),
                'employee' => [
                    'id' => $user->id,
                    'name' => $user->first_name . ' ' . $user->last_name,
                    'employee_id' => $user->employee_id,
                ],
            ];

            return response()->json([
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching my balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all employees leave balances (Admin/HR only)
     * GET /api/employees/leave-balances
     */
    public function allBalances(Request $request): JsonResponse
    {
        try {
            Log::info('📊 Fetching all employees leave balances');

            // Get all active employees with their balances
            $employees = Employee::with([
                'department:id,name,code',
                'leaveBalances' => function ($query) {
                    $query->where('year', date('Y'))
                        ->with('leaveType:id,name,code');
                }
            ])->where('status', 'active');

            // Search filter
            if ($request->filled('search')) {
                $search = $request->search;
                $employees->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Department filter
            if ($request->filled('department_id')) {
                $employees->where('department_id', $request->department_id);
            }

            $perPage = $request->input('per_page', 20);
            $employees = $employees->paginate($perPage);

            // Format response
            $result = $employees->map(function ($employee) {
                // Get leave types for this employee
                $leaveTypes = LeaveType::where('is_active', true)->get();
                $balances = [];

                foreach ($leaveTypes as $leaveType) {
                    $balance = $employee->leaveBalances->firstWhere('leave_type_id', $leaveType->id);

                    $balances[] = [
                        'leave_type_id' => $leaveType->id,
                        'leave_type' => $leaveType->name,
                        'leave_code' => $leaveType->code,
                        'total_entitlement' => (float) ($balance->total_entitlement ?? 0),
                        'used_days' => (float) ($balance->used_days ?? 0),
                        'pending_days' => (float) ($balance->pending_days ?? 0),
                        'remaining_days' => (float) ($balance->remaining_days ?? 0),
                    ];
                }

                // Calculate total summary
                $totalEntitlement = array_sum(array_column($balances, 'total_entitlement'));
                $totalUsed = array_sum(array_column($balances, 'used_days'));
                $totalPending = array_sum(array_column($balances, 'pending_days'));
                $totalRemaining = array_sum(array_column($balances, 'remaining_days'));

                return [
                    'id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'email' => $employee->email,
                    'department' => [
                        'id' => $employee->department->id ?? null,
                        'name' => $employee->department->name ?? 'N/A',
                        'code' => $employee->department->code ?? null,
                    ],
                    'hire_date' => $employee->hire_date,
                    'years_of_service' => Carbon::parse($employee->hire_date)->diffInYears(Carbon::now()),
                    'leave_balances' => $balances,
                    'summary' => [
                        'total_entitlement' => $totalEntitlement,
                        'used_days' => $totalUsed,
                        'pending_days' => $totalPending,
                        'remaining_days' => $totalRemaining,
                    ],
                ];
            });

            return response()->json([
                'status' => 'success',
                'data' => [
                    'data' => $result,
                    'pagination' => [
                        'current_page' => $employees->currentPage(),
                        'per_page' => $employees->perPage(),
                        'total' => $employees->total(),
                        'last_page' => $employees->lastPage(),
                    ],
                ],
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
     * Get employee balance by ID (Admin/HR only)
     * GET /api/employees/{employeeId}/leave-balance
     */
    public function getEmployeeBalance(Request $request, $employeeId): JsonResponse
    {
        try {
            $employee = Employee::with([
                'department:id,name,code',
                'leaveBalances' => function ($query) {
                    $query->where('year', date('Y'))
                        ->with('leaveType:id,name,code');
                }
            ])->find($employeeId);

            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found'
                ], 404);
            }

            // Ensure balance exists
            $this->balanceService->ensureBalanceExists($employee);

            // Refresh balances
            $employee->load([
                'leaveBalances' => function ($query) {
                    $query->where('year', date('Y'))
                        ->with('leaveType:id,name,code');
                }
            ]);

            $leaveTypes = LeaveType::where('is_active', true)->get();
            $balances = [];

            foreach ($leaveTypes as $leaveType) {
                $balance = $employee->leaveBalances->firstWhere('leave_type_id', $leaveType->id);

                $balances[] = [
                    'leave_type_id' => $leaveType->id,
                    'leave_type' => $leaveType->name,
                    'leave_code' => $leaveType->code,
                    'total_entitlement' => (float) ($balance->total_entitlement ?? 0),
                    'used_days' => (float) ($balance->used_days ?? 0),
                    'pending_days' => (float) ($balance->pending_days ?? 0),
                    'remaining_days' => (float) ($balance->remaining_days ?? 0),
                ];
            }

            $totalEntitlement = array_sum(array_column($balances, 'total_entitlement'));
            $totalUsed = array_sum(array_column($balances, 'used_days'));
            $totalPending = array_sum(array_column($balances, 'pending_days'));
            $totalRemaining = array_sum(array_column($balances, 'remaining_days'));

            $result = [
                'employee' => [
                    'id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'email' => $employee->email,
                    'department' => $employee->department->name ?? 'N/A',
                    'hire_date' => $employee->hire_date,
                    'years_of_service' => Carbon::parse($employee->hire_date)->diffInYears(Carbon::now()),
                ],
                'leave_balances' => $balances,
                'summary' => [
                    'total_entitlement' => $totalEntitlement,
                    'used_days' => $totalUsed,
                    'pending_days' => $totalPending,
                    'remaining_days' => $totalRemaining,
                ],
            ];

            return response()->json([
                'status' => 'success',
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
     * Generate balance for employee (Admin/HR only)
     * POST /api/employees/generate-balance
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

            $this->balanceService->ensureBalanceExists($employee);

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
     * Generate balances for all employees (Admin/HR only)
     * POST /api/employees/generate-all-balances
     */
    public function generateAllBalances(Request $request): JsonResponse
    {
        try {
            $employees = Employee::where('status', 'active')->get();
            $count = 0;

            foreach ($employees as $employee) {
                try {
                    $this->balanceService->ensureBalanceExists($employee);
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
}