<?php
// app/Http/Controllers/Api/LeaveBalanceController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Services\Leave\LeaveBalanceService;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class LeaveBalanceController extends Controller
{
    use ApiResponseTrait;

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
            Log::info('📊 Fetching my leave balance');

            $user = $request->user();

            if (!$user) {
                return $this->error('User not authenticated', 401);
            }

            $employee = Employee::where('email', $user->email)->first();

            if (!$employee) {
                return $this->error('Employee record not found. Please contact HR.', 404);
            }

            $this->balanceService->ensureBalanceExists($employee);

            $balances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            $previousYearBalances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', date('Y') - 1)
                ->with('leaveType')
                ->get();

            $totalBalance = [
                'total_entitlement' => 0,
                'used_days' => 0,
                'pending_days' => 0,
                'remaining_days' => 0,
            ];

            foreach ($balances as $balance) {
                $totalBalance['total_entitlement'] += (float) $balance->total_entitlement;
                $totalBalance['used_days'] += (float) $balance->used_days;
                $totalBalance['pending_days'] += (float) $balance->pending_days;
                $totalBalance['remaining_days'] += (float) $balance->remaining_days;
            }

            return $this->success([
                'balances' => $balances,
                'total_balance' => $totalBalance,
                'previous_year_balances' => $previousYearBalances,
                'employee' => [
                    'id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'email' => $employee->email,
                    'department' => $employee->department->name ?? 'N/A',
                    'position' => $employee->position->title ?? 'N/A',
                    'hire_date' => $employee->hire_date,
                    'years_of_service' => Carbon::parse($employee->hire_date)->diffInYears(Carbon::now()),
                ],
            ], 'Balance fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching my balance: ' . $e->getMessage());
            return $this->error('Failed to fetch balance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all employees leave balances
     */
    public function allBalances(Request $request): JsonResponse
    {
        try {
            Log::info('📊 Fetching all employees leave balances');

            $leaveTypes = LeaveType::where('is_active', true)->get();

            $employees = Employee::with([
                'department:id,name,code',
                'leaveBalances' => function ($query) use ($leaveTypes) {
                    $query->where('year', date('Y'))
                        ->whereIn('leave_type_id', $leaveTypes->pluck('id'))
                        ->with('leaveType:id,name,code');
                }
            ])->where('status', 'active');

            if ($request->filled('search')) {
                $search = $request->search;
                $employees->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            if ($request->filled('department_id')) {
                $employees->where('department_id', $request->department_id);
            }

            if ($request->filled('leave_type_id')) {
                $leaveTypeId = $request->leave_type_id;
                $employees->whereHas('leaveBalances', function ($q) use ($leaveTypeId) {
                    $q->where('leave_type_id', $leaveTypeId);
                });
            }

            $perPage = $request->input('per_page', 20);
            $employees = $employees->paginate($perPage);

            $result = $employees->map(function ($employee) use ($leaveTypes) {
                $balanceData = [];
                $totalCarryForward = 0;

                foreach ($leaveTypes as $leaveType) {
                    $balance = $employee->leaveBalances->firstWhere('leave_type_id', $leaveType->id);
                    $carryForward = $balance->carry_forward ?? 0;
                    $totalCarryForward += $carryForward;

                    $balanceData[] = [
                        'id' => $balance->id ?? null,
                        'leave_type_id' => $leaveType->id,
                        'leave_type' => $leaveType->name,
                        'leave_code' => $leaveType->code,
                        'total_entitlement' => (float) ($balance->total_entitlement ?? 0),
                        'used_days' => (float) ($balance->used_days ?? 0),
                        'pending_days' => (float) ($balance->pending_days ?? 0),
                        'remaining_days' => (float) ($balance->remaining_days ?? 0),
                        'carry_forward' => (float) $carryForward,
                    ];
                }

                $annualLeave = $employee->leaveBalances->firstWhere('leaveType.code', 'AL');
                $sickLeave = $employee->leaveBalances->firstWhere('leaveType.code', 'SL');
                $specialLeave = $employee->leaveBalances->firstWhere('leaveType.code', 'SPL');

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
                    'leave_balances' => $balanceData,
                    'annual_leave' => [
                        'remaining_days' => (float) ($annualLeave->remaining_days ?? 0),
                        'carry_forward' => (float) ($annualLeave->carry_forward ?? 0),
                    ],
                    'sick_leave' => [
                        'remaining_days' => (float) ($sickLeave->remaining_days ?? 0),
                        'carry_forward' => (float) ($sickLeave->carry_forward ?? 0),
                    ],
                    'special_leave' => [
                        'remaining_days' => (float) ($specialLeave->remaining_days ?? 0),
                        'carry_forward' => (float) ($specialLeave->carry_forward ?? 0),
                    ],
                    'summary' => [
                        'total_entitlement' => array_sum(array_column($balanceData, 'total_entitlement')),
                        'used_days' => array_sum(array_column($balanceData, 'used_days')),
                        'pending_days' => array_sum(array_column($balanceData, 'pending_days')),
                        'remaining_days' => array_sum(array_column($balanceData, 'remaining_days')),
                        'total_carry_forward' => $totalCarryForward,
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
            ], 'All balances fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching all balances: ' . $e->getMessage());
            return $this->error('Failed to fetch all balances: ' . $e->getMessage(), 500);
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
                            'department' => $employee->department ? [
                                'id' => $employee->department->id,
                                'name' => $employee->department->name,
                            ] : null,
                            'position' => $employee->position ? [
                                'id' => $employee->position->id,
                                'title' => $employee->position->title,
                            ] : null,
                        ];
                    }),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error fetching employees without balances: ' . $e->getMessage());
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
            Log::info('🔄 API: Generating balances for new employees');

            $year = $request->input('year', date('Y'));

            $result = $this->balanceService->generateBalancesForNewEmployees($year);

            return response()->json([
                'status' => 'success',
                'message' => $result['message'],
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error generating balances: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate balances: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update leave balance
     */
    public function updateBalance(Request $request, $id): JsonResponse
    {
        try {
            Log::info("✏️ Updating balance for ID: {$id}");

            $validator = Validator::make($request->all(), [
                'total_entitlement' => 'required|numeric|min:0',
                'adjustment_reason' => 'required|string|min:5',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $balance = LeaveBalance::with(['employee', 'leaveType'])->find($id);

            if (!$balance) {
                return $this->notFound('Balance not found');
            }

            $user = $request->user();
            $oldRemaining = $balance->remaining_days;
            $newTotal = (float) $request->total_entitlement;

            DB::beginTransaction();

            try {
                $newRemaining = $newTotal - $balance->used_days - $balance->pending_days;

                $balance->total_entitlement = $newTotal;
                $balance->manual_adjustment = $newTotal - $balance->base_entitlement;
                $balance->adjustment_reason = $request->adjustment_reason;
                $balance->adjusted_by = $user->id;
                $balance->adjusted_at = now();
                $balance->remaining_days = max(0, $newRemaining);
                $balance->save();

                DB::commit();

                return $this->success([
                    'id' => $balance->id,
                    'employee_id' => $balance->employee_id,
                    'employee_name' => $balance->employee->first_name . ' ' . $balance->employee->last_name,
                    'leave_type' => $balance->leaveType->name ?? 'N/A',
                    'old_remaining' => $oldRemaining,
                    'new_remaining' => $balance->remaining_days,
                    'adjustment_reason' => $request->adjustment_reason,
                    'adjusted_by' => $user->email,
                    'adjusted_at' => $balance->adjusted_at,
                ], 'Leave balance updated successfully');
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('❌ Error updating balance: ' . $e->getMessage());
            return $this->error('Failed to update balance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update carry forward
     */
    public function updateCarryForward(Request $request, $id): JsonResponse
    {
        try {
            Log::info("🔄 Updating carry forward for balance ID: {$id}");

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

            $balance = LeaveBalance::with(['employee', 'leaveType'])->find($id);

            if (!$balance) {
                return $this->notFound('Balance not found');
            }

            $leaveType = $balance->leaveType;
            if (!$leaveType || !$leaveType->allow_carry_forward) {
                return $this->error('This leave type does not allow carry forward', 422);
            }

            $user = $request->user();
            $oldCarryForward = (float) $balance->carry_forward;
            $newCarryForward = (float) $request->carry_forward;

            DB::beginTransaction();

            try {
                $balance->carry_forward = $newCarryForward;
                $balance->total_entitlement = $balance->base_entitlement + $newCarryForward;
                $balance->remaining_days = $balance->total_entitlement - $balance->used_days - $balance->pending_days;

                if ($balance->remaining_days < 0) {
                    $balance->remaining_days = 0;
                }

                $balance->adjustment_reason = $request->adjustment_reason;
                $balance->adjusted_by = $user->id;
                $balance->adjusted_at = now();
                $balance->save();

                DB::commit();

                return $this->success([
                    'id' => $balance->id,
                    'employee_id' => $balance->employee_id,
                    'employee_name' => $balance->employee->first_name . ' ' . $balance->employee->last_name,
                    'leave_type' => $balance->leaveType->name ?? 'N/A',
                    'old_carry_forward' => $oldCarryForward,
                    'new_carry_forward' => $newCarryForward,
                    'total_entitlement' => $balance->total_entitlement,
                    'remaining_days' => $balance->remaining_days,
                    'adjustment_reason' => $request->adjustment_reason,
                    'adjusted_by' => $user->email,
                    'adjusted_at' => $balance->adjusted_at,
                ], 'Carry forward updated successfully');
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('❌ Error updating carry forward: ' . $e->getMessage());
            return $this->error('Failed to update carry forward: ' . $e->getMessage(), 500);
        }
    }
}