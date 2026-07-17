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
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class LeaveBalanceController extends Controller
{
    protected LeaveBalanceService $balanceService;

    public function __construct(LeaveBalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    // ==========================================
    // GET METHODS
    // ==========================================

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

            $employee = Employee::where('email', $user->email)->first();

            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee record not found. Please contact HR.'
                ], 404);
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
    public function getEmployeeBalance($employeeId): JsonResponse
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

            $balances = LeaveBalance::where('employee_id', $employeeId)
                ->where('year', date('Y'))
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
                    'carry_forward' => (float) ($balance->carry_forward ?? 0),
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
     * Get adjustment history for an employee (Admin/HR only)
     */
    public function getAdjustmentHistory($employeeId): JsonResponse
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

            $balances = LeaveBalance::where('employee_id', $employeeId)
                ->where('year', date('Y'))
                ->where('manual_adjustment', '!=', 0)
                ->with(['leaveType', 'adjustedBy'])
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'employee' => [
                        'id' => $employee->id,
                        'employee_id' => $employee->employee_id,
                        'name' => $employee->first_name . ' ' . $employee->last_name,
                    ],
                    'history' => $balances,
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
     * Get balance summary (Admin/HR only)
     */
    public function getBalanceSummary(Request $request): JsonResponse
    {
        try {
            $year = $request->input('year', date('Y'));

            $summary = [
                'total_employees' => Employee::where('status', 'active')->count(),
                'total_leave_balances' => LeaveBalance::where('year', $year)->count(),
                'by_leave_type' => [],
                'total_entitlement' => 0,
                'total_used' => 0,
                'total_pending' => 0,
                'total_remaining' => 0,
                'total_carry_forward' => 0,
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
                $totalCarryForward = $balances->sum('carry_forward');

                $summary['by_leave_type'][] = [
                    'leave_type_id' => $leaveType->id,
                    'leave_type' => $leaveType->name,
                    'code' => $leaveType->code,
                    'total_entitlement' => (float) $totalEntitlement,
                    'used_days' => (float) $totalUsed,
                    'pending_days' => (float) $totalPending,
                    'remaining_days' => (float) $totalRemaining,
                    'carry_forward' => (float) $totalCarryForward,
                ];

                $summary['total_entitlement'] += $totalEntitlement;
                $summary['total_used'] += $totalUsed;
                $summary['total_pending'] += $totalPending;
                $summary['total_remaining'] += $totalRemaining;
                $summary['total_carry_forward'] += $totalCarryForward;
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
     * Get balance report (Admin/HR only)
     */
    public function getBalanceReport(Request $request): JsonResponse
    {
        try {
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
                        'carry_forward' => (float) ($balance->carry_forward ?? 0),
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

    /**
     * Get employees without balances (Admin/HR only)
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

    // ==========================================
    // CREATE / GENERATE METHODS
    // ==========================================

    /**
     * Generate balance for a specific employee (Admin/HR only)
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            Log::info("🔄 Generating balance for employee");

            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employees,id',
                'year' => 'nullable|integer|min:2020|max:2030',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $employee = Employee::find($request->employee_id);
            $year = $request->year ?? date('Y');

            $existingBalances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', $year)
                ->count();

            if ($existingBalances > 0) {
                return response()->json([
                    'status' => 'warning',
                    'message' => 'Employee already has balances for this year',
                    'data' => [
                        'employee' => $employee,
                        'year' => $year,
                        'existing_balances' => $existingBalances,
                    ],
                ]);
            }

            $result = $this->balanceService->generateBalanceForNewEmployee($employee, $year);

            return response()->json([
                'status' => 'success',
                'message' => 'Balance generated successfully',
                'data' => $result,
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
     * Generate balances for all new employees (Admin/HR only)
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
     * Generate all balances for all employees (Admin/HR only)
     */
    public function generateAllBalances(Request $request): JsonResponse
    {
        try {
            Log::info("🔄 Generating balances for all employees");

            $year = $request->input('year', date('Y'));
            $employees = Employee::where('status', 'active')->get();

            $generated = 0;
            $failed = 0;
            $results = [];

            foreach ($employees as $employee) {
                try {
                    $hasBalances = LeaveBalance::where('employee_id', $employee->id)
                        ->where('year', $year)
                        ->exists();

                    if (!$hasBalances) {
                        $result = $this->balanceService->generateBalanceForNewEmployee($employee, $year);
                        $results[] = $result;
                        $generated++;
                    }
                } catch (\Exception $e) {
                    Log::error("Failed to generate balance for employee {$employee->id}: " . $e->getMessage());
                    $failed++;
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => "Balances generated for {$generated} employees",
                'data' => [
                    'year' => $year,
                    'total_employees' => $employees->count(),
                    'generated' => $generated,
                    'failed' => $failed,
                    'results' => $results,
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
     * Auto-generate balances (for cron job)
     */
    public function autoGenerateBalances(Request $request): JsonResponse
    {
        try {
            Log::info("🔄 Auto-generating balances for new employees");

            $result = $this->balanceService->generateBalancesForNewEmployees();

            return response()->json([
                'status' => 'success',
                'message' => "Processed {$result['total_processed']} employees",
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error auto-generating balances: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to auto-generate balances: ' . $e->getMessage()
            ], 500);
        }
    }

    // ==========================================
    // UPDATE METHODS
    // ==========================================

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
                $newRemaining = $newTotal - $balance->used_days - $balance->pending_days;

                $balance->total_entitlement = $newTotal;
                $balance->manual_adjustment = $newTotal - $balance->base_entitlement;
                $balance->adjustment_reason = $request->adjustment_reason;
                $balance->adjusted_by = $user->id;
                $balance->adjusted_at = now();
                $balance->remaining_days = max(0, $newRemaining);
                $balance->save();

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
                        'adjusted_by' => $user->email,
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
     * Update carry forward (Admin/HR only)
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
                return response()->json([
                    'status' => 'error',
                    'message' => 'Balance not found'
                ], 404);
            }

            $leaveType = $balance->leaveType;
            if (!$leaveType || !$leaveType->allow_carry_forward) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This leave type does not allow carry forward'
                ], 422);
            }

            if ($leaveType->code !== 'AL') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Carry forward is only allowed for Annual Leave (AL)'
                ], 422);
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

                return response()->json([
                    'status' => 'success',
                    'message' => 'Carry forward updated successfully',
                    'data' => [
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
                    ]
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('❌ Error updating carry forward: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update carry forward: ' . $e->getMessage()
            ], 500);
        }
    }

    // ==========================================
    // DELETE / PROCESS METHODS
    // ==========================================

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
            $results = [];

            foreach ($employees as $employee) {
                try {
                    $previousBalances = LeaveBalance::where('employee_id', $employee->id)
                        ->where('year', $fromYear)
                        ->get();

                    $employeeCarried = 0;

                    foreach ($previousBalances as $previousBalance) {
                        $leaveType = $previousBalance->leaveType;
                        if (!$leaveType || !$leaveType->allow_carry_forward) {
                            continue;
                        }

                        $maxCarryForward = $leaveType->max_carry_forward_days ?? 6;
                        $carryForwardDays = min((float) $previousBalance->remaining_days, $maxCarryForward);

                        if ($carryForwardDays > 0) {
                            $newBalance = LeaveBalance::where([
                                'employee_id' => $employee->id,
                                'leave_type_id' => $previousBalance->leave_type_id,
                                'year' => $toYear,
                            ])->first();

                            if ($newBalance) {
                                $newBalance->carry_forward += $carryForwardDays;
                                $newBalance->total_entitlement += $carryForwardDays;
                                $newBalance->remaining_days += $carryForwardDays;
                                $newBalance->save();
                                $carriedForward += $carryForwardDays;
                                $employeeCarried += $carryForwardDays;
                            }
                        }
                    }

                    if ($employeeCarried > 0) {
                        $results[] = [
                            'employee_id' => $employee->id,
                            'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                            'carried_days' => $employeeCarried,
                        ];
                    }

                    $processed++;
                } catch (\Exception $e) {
                    Log::error("Failed to process carry forward for employee {$employee->id}: " . $e->getMessage());
                }
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'from_year' => $fromYear,
                    'to_year' => $toYear,
                    'employees_processed' => $processed,
                    'total_carried_forward_days' => $carriedForward,
                    'results' => $results,
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
     * Delete balance (Admin/HR only)
     */
    public function destroy($id): JsonResponse
    {
        try {
            Log::info("🗑️ Deleting balance ID: {$id}");

            $balance = LeaveBalance::find($id);

            if (!$balance) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Balance not found'
                ], 404);
            }

            $balance->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Balance deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error deleting balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete balance: ' . $e->getMessage()
            ], 500);
        }
    }
}