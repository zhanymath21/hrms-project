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
     * Get all employees leave balances (Admin/HR only)
     * GET /api/employees/leave-balances
     */
    public function allBalances(Request $request): JsonResponse
    {
        try {
            Log::info('📊 Fetching all employees leave balances');

            // Get all leave types
            $leaveTypes = LeaveType::where('is_active', true)->get();

            // Get all active employees with their balances
            $employees = Employee::with([
                'department:id,name,code',
                'leaveBalances' => function ($query) use ($leaveTypes) {
                    $query->where('year', date('Y'))
                        ->whereIn('leave_type_id', $leaveTypes->pluck('id'))
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
            $result = $employees->map(function ($employee) use ($leaveTypes) {
                $balanceData = [];

                foreach ($leaveTypes as $leaveType) {
                    $balance = $employee->leaveBalances->firstWhere('leave_type_id', $leaveType->id);

                    $balanceData[] = [
                        'leave_type' => $leaveType->name,
                        'leave_code' => $leaveType->code,
                        'total_entitlement' => (float) ($balance->total_entitlement ?? 0),
                        'used_days' => (float) ($balance->used_days ?? 0),
                        'pending_days' => (float) ($balance->pending_days ?? 0),
                        'remaining_days' => (float) ($balance->remaining_days ?? 0),
                    ];
                }

                return [
                    'id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department->name ?? 'N/A',
                    'leave_balances' => $balanceData,
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

            $balances = LeaveBalance::where('employee_id', $user->id)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'balances' => $balances->map(function ($balance) {
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

    /**
     * Update leave balance (Admin/HR only)
     * PUT /api/employees/leave-balance/{id}
     */
    public function updateBalance(Request $request, $id): JsonResponse
    {
        try {
            $balance = LeaveBalance::with(['employee', 'leaveType'])->find($id);

            if (!$balance) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Balance not found'
                ], 404);
            }

            $request->validate([
                'total_entitlement' => 'required|numeric|min:0',
                'adjustment_reason' => 'required|string|min:5',
            ]);

            $balance->total_entitlement = $request->total_entitlement;
            $balance->remaining_days = $request->total_entitlement - $balance->used_days - $balance->pending_days;
            $balance->adjustment_reason = $request->adjustment_reason;
            $balance->adjusted_by = $request->user()->id;
            $balance->adjusted_at = now();
            $balance->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Leave balance updated successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update balance: ' . $e->getMessage()
            ], 500);
        }
    }
}