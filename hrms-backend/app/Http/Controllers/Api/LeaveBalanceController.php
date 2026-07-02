<?php
// app/Http/Controllers/Api/LeaveBalanceController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Services\Leave\LeaveBalanceService;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LeaveBalanceController extends Controller
{
    use ApiResponseTrait;

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
                Log::error('User not authenticated');
                return $this->error('User not authenticated', 401);
            }

            Log::info('Fetching balance for user: ' . $user->id . ' - ' . $user->email);

            // Ensure balance exists
            $this->balanceService->ensureBalanceExists($user);

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
                        'base_entitlement' => (float) $balance->base_entitlement ?? 0,
                        'seniority_bonus' => (float) $balance->seniority_bonus ?? 0,
                        'carry_forward' => (float) $balance->carry_forward ?? 0,
                        'replacement_days' => (float) $balance->replacement_days ?? 0,
                        'total_entitlement' => (float) $balance->total_entitlement ?? 0,
                        'used_days' => (float) $balance->used_days ?? 0,
                        'pending_days' => (float) $balance->pending_days ?? 0,
                        'remaining_days' => (float) $balance->remaining_days ?? 0,
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

            return $this->success($result, 'My leave balance fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching my balance: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return $this->error('Failed to fetch balance: ' . $e->getMessage(), 500);
        }
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
                return $this->unauthorized('Only Admin/HR can view other employee balances');
            }

            $employee = Employee::find($employeeId);
            if (!$employee) {
                return $this->notFound('Employee not found');
            }

            $this->balanceService->ensureBalanceExists($employee);

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
                        'base_entitlement' => (float) $balance->base_entitlement ?? 0,
                        'seniority_bonus' => (float) $balance->seniority_bonus ?? 0,
                        'carry_forward' => (float) $balance->carry_forward ?? 0,
                        'replacement_days' => (float) $balance->replacement_days ?? 0,
                        'total_entitlement' => (float) $balance->total_entitlement ?? 0,
                        'used_days' => (float) $balance->used_days ?? 0,
                        'pending_days' => (float) $balance->pending_days ?? 0,
                        'remaining_days' => (float) $balance->remaining_days ?? 0,
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

            return $this->success($result, 'Employee balance fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching employee balance: ' . $e->getMessage());
            return $this->error('Failed to fetch employee balance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all employees leave balances (Admin/HR only)
     * GET /api/employees/leave-balances
     */
    public function allBalances(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return $this->unauthorized('Only Admin/HR can view all employees balances');
            }

            $query = Employee::with([
                'department:id,name',
                'leaveBalances' => function ($query) {
                    $query->where('year', date('Y'))->with('leaveType:id,name,code');
                }
            ])->where('status', 'active');

            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            }

            $perPage = $request->input('per_page', 20);
            $employees = $query->paginate($perPage);

            $result = $employees->map(function ($employee) {
                $totalBalance = 0;
                $usedBalance = 0;
                $remainingBalance = 0;

                foreach ($employee->leaveBalances as $balance) {
                    $totalBalance += (float) $balance->total_entitlement ?? 0;
                    $usedBalance += (float) $balance->used_days ?? 0;
                    $remainingBalance += (float) $balance->remaining_days ?? 0;
                }

                return [
                    'id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department->name ?? 'N/A',
                    'hire_date' => $employee->hire_date,
                    'years_of_service' => Carbon::parse($employee->hire_date)->diffInYears(Carbon::now()),
                    'leave_balances' => $employee->leaveBalances->map(function ($balance) {
                        return [
                            'id' => $balance->id,
                            'leave_type' => $balance->leaveType->name ?? 'Unknown',
                            'leave_code' => $balance->leaveType->code ?? 'N/A',
                            'total_entitlement' => (float) $balance->total_entitlement ?? 0,
                            'used_days' => (float) $balance->used_days ?? 0,
                            'pending_days' => (float) $balance->pending_days ?? 0,
                            'remaining_days' => (float) $balance->remaining_days ?? 0,
                        ];
                    }),
                    'summary' => [
                        'total_entitlement' => $totalBalance,
                        'used_days' => $usedBalance,
                        'remaining_days' => $remainingBalance,
                    ],
                ];
            });

            return $this->success([
                'data' => $result,
                'pagination' => [
                    'current_page' => $employees->currentPage(),
                    'per_page' => $employees->perPage(),
                    'total' => $employees->total(),
                    'last_page' => $employees->lastPage(),
                ],
            ], 'All balances fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching all balances: ' . $e->getMessage());
            return $this->error('Failed to fetch all balances: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate balance for employee (Admin/HR only)
     * POST /api/employees/generate-balance
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return $this->unauthorized('Only Admin/HR can generate balances');
            }

            $employeeId = $request->employee_id;
            if (!$employeeId) {
                return $this->error('Employee ID is required', 422);
            }

            $employee = Employee::find($employeeId);
            if (!$employee) {
                return $this->notFound('Employee not found');
            }

            $this->balanceService->ensureBalanceExists($employee);

            return $this->success(null, 'Leave balance generated successfully for ' . $employee->first_name);
        } catch (\Exception $e) {
            Log::error('Error generating balance: ' . $e->getMessage());
            return $this->error('Failed to generate balance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate balances for all employees (Admin/HR only)
     * POST /api/employees/generate-all-balances
     */
    public function generateAllBalances(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return $this->unauthorized('Only Admin/HR can generate all balances');
            }

            $employees = Employee::where('status', 'active')->get();
            $count = 0;

            foreach ($employees as $employee) {
                try {
                    $this->balanceService->ensureBalanceExists($employee);
                    $count++;
                } catch (\Exception $e) {
                    Log::error('Failed to generate balance for employee ' . $employee->id . ': ' . $e->getMessage());
                }
            }

            return $this->success(null, "Balance generated for {$count} employees");
        } catch (\Exception $e) {
            Log::error('Error generating all balances: ' . $e->getMessage());
            return $this->error('Failed to generate all balances: ' . $e->getMessage(), 500);
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