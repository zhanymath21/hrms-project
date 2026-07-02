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

    /**
     * Get all employees leave balances (Admin/HR only)
     * GET /api/employees/leave-balance
     * 
     * Expected response format for frontend:
     * {
     *   status: 'success',
     *   data: [
     *     {
     *       id, employee_id, name, email,
     *       department: { id, name, code },
     *       hire_date, years_of_service,
     *       leave_balances: [...],
     *       annual_leave: { id, total, used, pending, remaining },
     *       sick_leave: { id, total, used, pending, remaining },
     *       special_leave: { id, total, used, pending, remaining },
     *       summary: { total_entitlement, used_days, pending_days, remaining_days }
     *     }
     *   ],
     *   pagination: { current_page, per_page, total, last_page }
     * }
     */
    public function allBalances(Request $request): JsonResponse
    {
        try {
            Log::info('📊 Fetching all employees leave balances');

            $year = $request->input('year', date('Y'));

            // Get all active leave types
            $leaveTypes = LeaveType::where('is_active', true)->get();

            // If no leave types exist, create default ones
            if ($leaveTypes->isEmpty()) {
                $leaveTypes = $this->createDefaultLeaveTypes();
            }

            // Build employee query
            $employeesQuery = Employee::with([
                'department:id,name,code',
                'leaveBalances' => function ($query) use ($leaveTypes, $year) {
                    $query->where('year', $year)
                        ->whereIn('leave_type_id', $leaveTypes->pluck('id'))
                        ->with('leaveType:id,name,code');
                }
            ])->where('status', 'active');

            // Search filter
            if ($request->filled('search')) {
                $search = $request->search;
                $employeesQuery->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'like', "%{$search}%");
                });
            }

            // Department filter
            if ($request->filled('department_id')) {
                $employeesQuery->where('department_id', $request->department_id);
            }

            // Pagination
            $perPage = $request->input('per_page', 20);
            $employees = $employeesQuery->paginate($perPage);

            // Format response to match frontend expectations
            $result = $employees->map(function ($employee) use ($leaveTypes, $year) {
                return $this->formatEmployeeBalance($employee, $leaveTypes, $year);
            });

            return response()->json([
                'status' => 'success',
                'data' => $result,
                'pagination' => [
                    'current_page' => $employees->currentPage(),
                    'per_page' => $employees->perPage(),
                    'total' => $employees->total(),
                    'last_page' => $employees->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching all balances: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch all balances: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get my leave balance (Employee)
     * GET /api/employees/leave-balance/my
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

            // Ensure balance exists for the user
            $this->balanceService->ensureBalanceExists($user);

            $year = $request->input('year', date('Y'));

            $balances = LeaveBalance::where('employee_id', $user->id)
                ->where('year', $year)
                ->with('leaveType')
                ->get();

            // Format response
            $formattedBalances = $balances->map(function ($balance) {
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
            });

            return response()->json([
                'status' => 'success',
                'data' => [
                    'balances' => $formattedBalances,
                    'year' => $year,
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
            $validator = Validator::make($request->all(), [
                'total_entitlement' => 'required|numeric|min:0',
                'adjustment_reason' => 'required|string|min:5|max:500',
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
            $oldTotal = $balance->total_entitlement;

            DB::beginTransaction();

            try {
                // Calculate new remaining days
                $newTotal = $request->total_entitlement;
                $usedDays = $balance->used_days ?? 0;
                $pendingDays = $balance->pending_days ?? 0;
                $newRemaining = $newTotal - $usedDays - $pendingDays;

                // Update balance
                $balance->total_entitlement = $newTotal;
                $balance->manual_adjustment = $newTotal - ($balance->base_entitlement ?? $newTotal);
                $balance->adjustment_reason = $request->adjustment_reason;
                $balance->adjusted_by = $user->id;
                $balance->adjusted_at = now();
                $balance->remaining_days = max(0, $newRemaining);
                $balance->save();

                // Log the adjustment (if you have a log model)
                // $this->logAdjustment($balance, $oldTotal, $oldRemaining, $user);

                DB::commit();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Leave balance updated successfully',
                    'data' => [
                        'id' => $balance->id,
                        'old_remaining' => $oldRemaining,
                        'new_remaining' => $balance->remaining_days,
                        'old_total' => $oldTotal,
                        'new_total' => $balance->total_entitlement,
                        'adjustment_reason' => $request->adjustment_reason,
                        'adjusted_by' => $user->first_name . ' ' . $user->last_name,
                        'adjusted_at' => $balance->adjusted_at,
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

    /**
     * Get balance detail (Admin/HR only)
     * GET /api/employees/leave-balance/{id}
     */
    public function getBalanceDetail($id): JsonResponse
    {
        try {
            $balance = LeaveBalance::with([
                'employee:id,first_name,last_name,employee_id,email',
                'leaveType:id,name,code,description',
                'adjustedBy:id,first_name,last_name'
            ])->find($id);

            if (!$balance) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Balance not found'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'id' => $balance->id,
                    'employee' => $balance->employee,
                    'leave_type' => $balance->leaveType,
                    'year' => $balance->year,
                    'total_entitlement' => (float) $balance->total_entitlement,
                    'used_days' => (float) $balance->used_days,
                    'pending_days' => (float) $balance->pending_days,
                    'remaining_days' => (float) $balance->remaining_days,
                    'manual_adjustment' => (float) $balance->manual_adjustment,
                    'adjustment_reason' => $balance->adjustment_reason,
                    'adjusted_by' => $balance->adjustedBy,
                    'adjusted_at' => $balance->adjusted_at,
                    'created_at' => $balance->created_at,
                    'updated_at' => $balance->updated_at,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching balance detail: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balance detail: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employee balance by ID (Admin/HR only)
     * GET /api/employees/{employeeId}/leave-balance
     */
    public function getEmployeeBalance($employeeId): JsonResponse
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

            $leaveTypes = LeaveType::where('is_active', true)->get();
            $formattedEmployee = $this->formatEmployeeBalance($employee, $leaveTypes, date('Y'));

            return response()->json([
                'status' => 'success',
                'data' => $formattedEmployee,
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
     * Get adjustment history for employee
     * GET /api/employees/leave-balance/{employeeId}/history
     */
    public function getAdjustmentHistory($employeeId): JsonResponse
    {
        try {
            $balances = LeaveBalance::where('employee_id', $employeeId)
                ->where(function ($q) {
                    $q->whereNotNull('adjusted_by')
                        ->orWhere('manual_adjustment', '!=', 0);
                })
                ->with(['leaveType', 'adjustedBy:id,first_name,last_name'])
                ->orderBy('adjusted_at', 'desc')
                ->get()
                ->map(function ($balance) {
                    return [
                        'id' => $balance->id,
                        'leave_type' => $balance->leaveType->name ?? 'Unknown',
                        'leave_code' => $balance->leaveType->code ?? 'N/A',
                        'year' => $balance->year,
                        'old_total' => (float) ($balance->total_entitlement - ($balance->manual_adjustment ?? 0)),
                        'new_total' => (float) $balance->total_entitlement,
                        'adjustment' => (float) ($balance->manual_adjustment ?? 0),
                        'reason' => $balance->adjustment_reason,
                        'adjusted_by' => $balance->adjustedBy ?
                            $balance->adjustedBy->first_name . ' ' . $balance->adjustedBy->last_name :
                            'System',
                        'adjusted_at' => $balance->adjusted_at,
                    ];
                });

            return response()->json([
                'status' => 'success',
                'data' => $balances,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching adjustment history: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch history: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate balance for employee (Admin/HR only)
     * POST /api/employees/leave-balance/generate
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employees,id',
                'year' => 'sometimes|integer|min:2000|max:2100',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $employee = Employee::find($request->employee_id);
            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found'
                ], 404);
            }

            $year = $request->input('year', date('Y'));
            $this->balanceService->ensureBalanceExists($employee, $year);

            return response()->json([
                'status' => 'success',
                'message' => "Balance generated successfully for {$employee->first_name} {$employee->last_name}",
                'data' => [
                    'employee_id' => $employee->id,
                    'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                    'year' => $year,
                ]
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
     * POST /api/employees/leave-balance/generate-all
     */
    public function generateAllBalances(Request $request): JsonResponse
    {
        try {
            $year = $request->input('year', date('Y'));
            $employees = Employee::where('status', 'active')->get();
            $count = 0;
            $failed = 0;
            $errors = [];

            foreach ($employees as $employee) {
                try {
                    $this->balanceService->ensureBalanceExists($employee, $year);
                    $count++;
                } catch (\Exception $e) {
                    $failed++;
                    $errors[] = "Employee ID {$employee->id}: " . $e->getMessage();
                    Log::error('Failed for employee ' . $employee->id . ': ' . $e->getMessage());
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => "Balance generated for {$count} employees",
                'data' => [
                    'processed' => $count,
                    'failed' => $failed,
                    'total' => $employees->count(),
                    'year' => $year,
                    'errors' => $errors,
                ]
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
     * Process carry forward (Admin/HR only)
     * POST /api/employees/leave-balance/carry-forward
     */
    public function processCarryForward(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'year' => 'sometimes|integer|min:2000|max:2100',
                'max_carry_forward' => 'sometimes|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $year = $request->input('year', date('Y') - 1);
            $maxCarryForward = $request->input('max_carry_forward', 30);

            $processed = $this->balanceService->processCarryForward($year, $maxCarryForward);

            return response()->json([
                'status' => 'success',
                'message' => "Processed {$processed} employees for carry forward from {$year} to " . ($year + 1),
                'data' => [
                    'from_year' => $year,
                    'to_year' => $year + 1,
                    'employees_processed' => $processed,
                    'max_carry_forward' => $maxCarryForward,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error processing carry forward: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to process carry forward: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get balance summary for dashboard
     * GET /api/employees/leave-balance/summary
     */
    public function getBalanceSummary(Request $request): JsonResponse
    {
        try {
            $year = $request->input('year', date('Y'));
            $leaveTypes = LeaveType::where('is_active', true)->get();

            // If no leave types, return empty summary
            if ($leaveTypes->isEmpty()) {
                return response()->json([
                    'status' => 'success',
                    'data' => [],
                ]);
            }

            $summary = [];

            foreach ($leaveTypes as $leaveType) {
                $balances = LeaveBalance::where('year', $year)
                    ->where('leave_type_id', $leaveType->id)
                    ->get();

                $totalEntitlement = $balances->sum('total_entitlement');
                $usedDays = $balances->sum('used_days');
                $pendingDays = $balances->sum('pending_days');
                $remainingDays = $balances->sum('remaining_days');
                $employeeCount = $balances->count();

                $summary[] = [
                    'leave_type_id' => $leaveType->id,
                    'leave_type' => $leaveType->name,
                    'leave_code' => $leaveType->code,
                    'total_entitlement' => (float) $totalEntitlement,
                    'used_days' => (float) $usedDays,
                    'pending_days' => (float) $pendingDays,
                    'remaining_days' => (float) $remainingDays,
                    'employee_count' => $employeeCount,
                    'average_remaining' => $employeeCount > 0 ? (float) ($remainingDays / $employeeCount) : 0,
                    'utilization_rate' => $totalEntitlement > 0 ?
                        (float) (($usedDays / $totalEntitlement) * 100) : 0,
                ];
            }

            return response()->json([
                'status' => 'success',
                'data' => $summary,
                'year' => $year,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching balance summary: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balance summary: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Format employee balance data for frontend
     */
    private function formatEmployeeBalance($employee, $leaveTypes, $year): array
    {
        $balanceData = [];
        $annualLeave = null;
        $sickLeave = null;
        $specialLeave = null;

        foreach ($leaveTypes as $leaveType) {
            $balance = $employee->leaveBalances->firstWhere('leave_type_id', $leaveType->id);

            $balanceItem = [
                'id' => $balance->id ?? null,
                'leave_type_id' => $leaveType->id,
                'leave_type' => $leaveType->name,
                'leave_code' => $leaveType->code,
                'total_entitlement' => (float) ($balance->total_entitlement ?? 0),
                'used_days' => (float) ($balance->used_days ?? 0),
                'pending_days' => (float) ($balance->pending_days ?? 0),
                'remaining_days' => (float) ($balance->remaining_days ?? 0),
            ];

            $balanceData[] = $balanceItem;

            // Map to specific leave types for easy access
            if ($leaveType->code === 'AL') {
                $annualLeave = $balanceItem;
            } elseif ($leaveType->code === 'SL') {
                $sickLeave = $balanceItem;
            } elseif ($leaveType->code === 'SPL') {
                $specialLeave = $balanceItem;
            }
        }

        // If specific leave types don't exist, create empty ones
        $annualLeave = $annualLeave ?? [
            'id' => null,
            'total' => 0,
            'used' => 0,
            'pending' => 0,
            'remaining' => 0,
        ];

        $sickLeave = $sickLeave ?? [
            'id' => null,
            'total' => 0,
            'used' => 0,
            'pending' => 0,
            'remaining' => 0,
        ];

        $specialLeave = $specialLeave ?? [
            'id' => null,
            'total' => 0,
            'used' => 0,
            'pending' => 0,
            'remaining' => 0,
        ];

        // Calculate summary
        $summary = [
            'total_entitlement' => array_sum(array_column($balanceData, 'total_entitlement')),
            'used_days' => array_sum(array_column($balanceData, 'used_days')),
            'pending_days' => array_sum(array_column($balanceData, 'pending_days')),
            'remaining_days' => array_sum(array_column($balanceData, 'remaining_days')),
        ];

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
            'years_of_service' => $employee->hire_date ?
                Carbon::parse($employee->hire_date)->diffInYears(Carbon::now()) : 0,
            'leave_balances' => $balanceData,
            'annual_leave' => $annualLeave,
            'sick_leave' => $sickLeave,
            'special_leave' => $specialLeave,
            'summary' => $summary,
        ];
    }

    /**
     * Create default leave types if none exist
     */
    private function createDefaultLeaveTypes(): \Illuminate\Database\Eloquent\Collection
    {
        $defaultTypes = [
            ['code' => 'AL', 'name' => 'Annual Leave', 'description' => 'Annual paid leave', 'is_active' => true],
            ['code' => 'SL', 'name' => 'Sick Leave', 'description' => 'Sick leave with medical certificate', 'is_active' => true],
            ['code' => 'SPL', 'name' => 'Special Leave', 'description' => 'Special paid leave', 'is_active' => true],
        ];

        $created = [];
        foreach ($defaultTypes as $type) {
            $leaveType = LeaveType::firstOrCreate(
                ['code' => $type['code']],
                $type
            );
            $created[] = $leaveType;
        }

        return collect($created);
    }
}