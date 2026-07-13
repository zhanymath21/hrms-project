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
     * Get my leave balance (for authenticated employee)
     */
    public function myBalance(Request $request): JsonResponse
    {
        try {
            Log::info('📊 Fetching my leave balance');

            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Find employee by user_id or email
            $employee = Employee::where('user_id', $user->id)->first();

            if (!$employee) {
                $employee = Employee::where('email', $user->email)->first();
            }

            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee record not found. Please contact HR.'
                ], 404);
            }

            // Ensure balance exists for this employee
            $this->balanceService->ensureBalanceExists($employee);

            // Get current year balances
            $balances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            // Get previous year balances for carry forward
            $previousYearBalances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', date('Y') - 1)
                ->with('leaveType')
                ->get();

            // Calculate totals
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

            return response()->json([
                'status' => 'success',
                'data' => [
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
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error fetching my balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all employees leave balances (Admin/HR only)
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

            // Apply filters
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
            Log::error('❌ Error fetching all balances: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch all balances: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get balance for a specific employee (Admin/HR only)
     */
    public function getEmployeeBalance(Request $request, $employeeId): JsonResponse
    {
        try {
            Log::info("📊 Fetching balance for employee ID: {$employeeId}");

            $employee = Employee::with(['department', 'position'])->find($employeeId);

            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found'
                ], 404);
            }

            $year = $request->input('year', date('Y'));

            $balances = LeaveBalance::where('employee_id', $employeeId)
                ->where('year', $year)
                ->with('leaveType')
                ->get();

            $leaveTypes = LeaveType::where('is_active', true)->get();
            $allBalances = [];

            foreach ($leaveTypes as $leaveType) {
                $balance = $balances->firstWhere('leave_type_id', $leaveType->id);
                $allBalances[] = [
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

            return response()->json([
                'status' => 'success',
                'data' => [
                    'employee' => [
                        'id' => $employee->id,
                        'employee_id' => $employee->employee_id,
                        'name' => $employee->first_name . ' ' . $employee->last_name,
                        'email' => $employee->email,
                        'department' => $employee->department->name ?? 'N/A',
                        'position' => $employee->position->title ?? 'N/A',
                        'hire_date' => $employee->hire_date,
                    ],
                    'year' => $year,
                    'balances' => $allBalances,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error fetching employee balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch employee balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get balance detail by ID (Admin/HR only)
     */
    public function getBalanceDetail($id): JsonResponse
    {
        try {
            Log::info("📊 Fetching balance detail for ID: {$id}");

            $balance = LeaveBalance::with(['employee', 'leaveType'])->find($id);

            if (!$balance) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Balance not found'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $balance,
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error fetching balance detail: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balance detail: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update leave balance (Admin/HR only)
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
                // Calculate new remaining days
                $newRemaining = $newTotal - $balance->used_days - $balance->pending_days;

                $balance->total_entitlement = $newTotal;
                $balance->manual_adjustment = $newTotal - $balance->base_entitlement;
                $balance->adjustment_reason = $request->adjustment_reason;
                $balance->adjusted_by = $user->id;
                $balance->adjusted_at = now();
                $balance->remaining_days = max(0, $newRemaining);
                $balance->save();

                // Log the adjustment
                Log::info("✅ Balance updated", [
                    'balance_id' => $balance->id,
                    'employee_id' => $balance->employee_id,
                    'old_remaining' => $oldRemaining,
                    'new_remaining' => $balance->remaining_days,
                    'adjusted_by' => $user->id,
                ]);

                DB::commit();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Leave balance updated successfully',
                    'data' => [
                        'id' => $balance->id,
                        'employee_id' => $balance->employee_id,
                        'employee_name' => $balance->employee->first_name . ' ' . $balance->employee->last_name,
                        'leave_type' => $balance->leaveType->name ?? 'N/A',
                        'old_remaining' => $oldRemaining,
                        'new_remaining' => $balance->remaining_days,
                        'adjustment_reason' => $request->adjustment_reason,
                        'adjusted_by' => $user->name ?? $user->email,
                        'adjusted_at' => $balance->adjusted_at,
                    ]
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('❌ Error updating balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get adjustment history for an employee (Admin/HR only)
     */
    public function getAdjustmentHistory(Request $request, $employeeId): JsonResponse
    {
        try {
            Log::info("📊 Fetching adjustment history for employee ID: {$employeeId}");

            $employee = Employee::find($employeeId);

            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found'
                ], 404);
            }

            $year = $request->input('year', date('Y'));

            $balances = LeaveBalance::where('employee_id', $employeeId)
                ->where('year', $year)
                ->with(['leaveType', 'adjustedBy'])
                ->get();

            $history = [];
            foreach ($balances as $balance) {
                if ($balance->manual_adjustment != 0) {
                    $history[] = [
                        'id' => $balance->id,
                        'leave_type' => $balance->leaveType->name ?? 'N/A',
                        'total_entitlement' => $balance->total_entitlement,
                        'base_entitlement' => $balance->base_entitlement,
                        'manual_adjustment' => $balance->manual_adjustment,
                        'adjustment_reason' => $balance->adjustment_reason,
                        'adjusted_by' => $balance->adjustedBy->name ?? 'System',
                        'adjusted_at' => $balance->adjusted_at,
                    ];
                }
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'employee' => [
                        'id' => $employee->id,
                        'employee_id' => $employee->employee_id,
                        'name' => $employee->first_name . ' ' . $employee->last_name,
                    ],
                    'year' => $year,
                    'history' => $history,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error fetching adjustment history: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch adjustment history: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate balance for a specific employee (Admin/HR only)
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            Log::info("🔄 Generating balance for employee");

            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employees,id',
                'year' => 'required|integer|min:2020|max:2030',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $employee = Employee::find($request->employee_id);
            $year = $request->year;

            $this->balanceService->ensureBalanceExists($employee);

            $balances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', $year)
                ->with('leaveType')
                ->get();

            return response()->json([
                'status' => 'success',
                'message' => 'Balance generated successfully',
                'data' => [
                    'employee' => [
                        'id' => $employee->id,
                        'employee_id' => $employee->employee_id,
                        'name' => $employee->first_name . ' ' . $employee->last_name,
                    ],
                    'year' => $year,
                    'balances' => $balances,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error generating balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate balance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate balances for all employees (Admin/HR only)
     */
    public function generateAllBalances(Request $request): JsonResponse
    {
        try {
            Log::info("🔄 Generating balances for all employees");

            $year = $request->input('year', date('Y'));
            $employees = Employee::where('status', 'active')->get();

            $generated = 0;
            $failed = 0;

            foreach ($employees as $employee) {
                try {
                    $this->balanceService->ensureBalanceExists($employee);
                    $generated++;
                } catch (\Exception $e) {
                    Log::error("Failed to generate balance for employee {$employee->id}: " . $e->getMessage());
                    $failed++;
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => "Balances generated successfully",
                'data' => [
                    'year' => $year,
                    'total_employees' => $employees->count(),
                    'generated' => $generated,
                    'failed' => $failed,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error generating all balances: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate all balances: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process carry forward for all employees (Admin/HR only)
     */
    public function processCarryForward(Request $request): JsonResponse
    {
        try {
            Log::info("🔄 Processing carry forward");

            $fromYear = $request->input('from_year', date('Y') - 1);
            $toYear = $request->input('to_year', date('Y'));

            $employees = Employee::where('status', 'active')->get();

            $processed = 0;
            $carriedForward = 0;

            foreach ($employees as $employee) {
                $previousBalances = LeaveBalance::where('employee_id', $employee->id)
                    ->where('year', $fromYear)
                    ->get();

                foreach ($previousBalances as $previousBalance) {
                    // Only carry forward remaining days up to a maximum (e.g., 5 days)
                    $carryForwardDays = min($previousBalance->remaining_days, 5);

                    if ($carryForwardDays > 0) {
                        $newBalance = LeaveBalance::where([
                            'employee_id' => $employee->id,
                            'leave_type_id' => $previousBalance->leave_type_id,
                            'year' => $toYear,
                        ])->first();

                        if ($newBalance) {
                            $newBalance->total_entitlement += $carryForwardDays;
                            $newBalance->remaining_days += $carryForwardDays;
                            $newBalance->save();
                            $carriedForward += $carryForwardDays;
                        }
                    }
                }
                $processed++;
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Carry forward processed successfully',
                'data' => [
                    'from_year' => $fromYear,
                    'to_year' => $toYear,
                    'employees_processed' => $processed,
                    'total_carried_forward_days' => $carriedForward,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error processing carry forward: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to process carry forward: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get balance summary (Admin/HR only)
     */
    public function getBalanceSummary(Request $request): JsonResponse
    {
        try {
            Log::info("📊 Fetching balance summary");

            $year = $request->input('year', date('Y'));

            $summary = [
                'total_employees' => Employee::where('status', 'active')->count(),
                'total_leave_balances' => LeaveBalance::where('year', $year)->count(),
                'by_leave_type' => [],
                'total_entitlement' => 0,
                'total_used' => 0,
                'total_pending' => 0,
                'total_remaining' => 0,
            ];

            $leaveTypes = LeaveType::where('is_active', true)->get();

            foreach ($leaveTypes as $leaveType) {
                $balances = LeaveBalance::where('year', $year)
                    ->where('leave_type_id', $leaveType->id)
                    ->get();

                $totalEntitlement = $balances->sum('total_entitlement');
                $totalUsed = $balances->sum('used_days');
                $totalPending = $balances->sum('pending_days');
                $totalRemaining = $balances->sum('remaining_days');

                $summary['by_leave_type'][] = [
                    'leave_type_id' => $leaveType->id,
                    'leave_type' => $leaveType->name,
                    'code' => $leaveType->code,
                    'total_entitlement' => (float) $totalEntitlement,
                    'used_days' => (float) $totalUsed,
                    'pending_days' => (float) $totalPending,
                    'remaining_days' => (float) $totalRemaining,
                ];

                $summary['total_entitlement'] += $totalEntitlement;
                $summary['total_used'] += $totalUsed;
                $summary['total_pending'] += $totalPending;
                $summary['total_remaining'] += $totalRemaining;
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'year' => $year,
                    'summary' => $summary,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error fetching balance summary: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balance summary: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get leave balance report (Admin/HR only)
     */
    public function getBalanceReport(Request $request): JsonResponse
    {
        try {
            Log::info("📊 Generating balance report");

            $year = $request->input('year', date('Y'));
            $departmentId = $request->input('department_id');

            $query = Employee::with([
                'department',
                'leaveBalances' => function ($q) use ($year) {
                    $q->where('year', $year)->with('leaveType');
                }
            ])->where('status', 'active');

            if ($departmentId) {
                $query->where('department_id', $departmentId);
            }

            $employees = $query->get();

            $report = $employees->map(function ($employee) {
                $balances = [];
                $totalRemaining = 0;

                foreach ($employee->leaveBalances as $balance) {
                    $balances[] = [
                        'leave_type' => $balance->leaveType->name ?? 'N/A',
                        'total_entitlement' => (float) $balance->total_entitlement,
                        'used_days' => (float) $balance->used_days,
                        'pending_days' => (float) $balance->pending_days,
                        'remaining_days' => (float) $balance->remaining_days,
                    ];
                    $totalRemaining += $balance->remaining_days;
                }

                return [
                    'employee_id' => $employee->employee_id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department->name ?? 'N/A',
                    'balances' => $balances,
                    'total_remaining' => (float) $totalRemaining,
                ];
            });

            return response()->json([
                'status' => 'success',
                'data' => [
                    'year' => $year,
                    'total_employees' => $report->count(),
                    'report' => $report,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error generating balance report: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate balance report: ' . $e->getMessage()
            ], 500);
        }
    }
}
