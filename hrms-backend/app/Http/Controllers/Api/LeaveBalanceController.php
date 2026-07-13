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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class LeaveBalanceController extends Controller
{
    protected LeaveBalanceService $balanceService;

    public function __construct(LeaveBalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

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

            $perPage = $request->input('per_page', 20);
            $employees = $employees->paginate($perPage);

            $result = $employees->map(function ($employee) use ($leaveTypes) {
                $balanceData = [];

                foreach ($leaveTypes as $leaveType) {
                    $balance = $employee->leaveBalances->firstWhere('leave_type_id', $leaveType->id);

                    $balanceData[] = [
                        'id' => $balance->id ?? null,
                        'leave_type_id' => $leaveType->id,
                        'leave_type' => $leaveType->name,
                        'leave_code' => $leaveType->code,
                        'total_entitlement' => (float) ($balance->total_entitlement ?? 0),
                        'used_days' => (float) ($balance->used_days ?? 0),
                        'pending_days' => (float) ($balance->pending_days ?? 0),
                        'remaining_days' => (float) ($balance->remaining_days ?? 0),
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
                    ],
                    'sick_leave' => [
                        'remaining_days' => (float) ($sickLeave->remaining_days ?? 0),
                    ],
                    'special_leave' => [
                        'remaining_days' => (float) ($specialLeave->remaining_days ?? 0),
                    ],
                    'summary' => [
                        'total_entitlement' => array_sum(array_column($balanceData, 'total_entitlement')),
                        'used_days' => array_sum(array_column($balanceData, 'used_days')),
                        'pending_days' => array_sum(array_column($balanceData, 'pending_days')),
                        'remaining_days' => array_sum(array_column($balanceData, 'remaining_days')),
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

            $employee = Employee::where('user_id', $user->id)->first()
                ?? Employee::where('email', $user->email)->first();

            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found. Please contact HR.'
                ], 404);
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
                        'hire_date' => $employee->hire_date,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching my balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balance: ' . $e->getMessage()
            ], 500);
        }
    }

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

            $balance = LeaveBalance::with(['employee', 'leaveType'])->find($id);

            if (!$balance) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Balance not found'
                ], 404);
            }

            $user = $request->user();
            $oldRemaining = $balance->remaining_days;
            $newTotal = (float) $request->total_entitlement;

            DB::beginTransaction();

            try {
                $balance->total_entitlement = $newTotal;
                $balance->manual_adjustment = $newTotal - $balance->base_entitlement;
                $balance->adjustment_reason = $request->adjustment_reason;
                $balance->adjusted_by = $user->id;
                $balance->adjusted_at = now();
                $balance->remaining_days = $newTotal - $balance->used_days - $balance->pending_days;
                $balance->save();

                DB::commit();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Leave balance updated successfully',
                    'data' => [
                        'id' => $balance->id,
                        'old_remaining' => $oldRemaining,
                        'new_remaining' => $balance->remaining_days,
                        'adjustment_reason' => $request->adjustment_reason,
                    ]
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Error updating balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update balance: ' . $e->getMessage()
            ], 500);
        }
    }
}
