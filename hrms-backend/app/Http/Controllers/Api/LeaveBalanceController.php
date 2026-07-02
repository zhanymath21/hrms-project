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

            // Ensure balance exists
            $this->balanceService->ensureBalanceExists($user);

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

                // Initialize all leave types
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

                // Get specific balances for quick access
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

                    // Detailed balances per leave type
                    'leave_balances' => $balanceData,

                    // Quick access for common leave types
                    'annual_leave' => [
                        'id' => $annualLeave->id ?? null,
                        'total' => (float) ($annualLeave->total_entitlement ?? 0),
                        'used' => (float) ($annualLeave->used_days ?? 0),
                        'pending' => (float) ($annualLeave->pending_days ?? 0),
                        'remaining' => (float) ($annualLeave->remaining_days ?? 0),
                    ],
                    'sick_leave' => [
                        'id' => $sickLeave->id ?? null,
                        'total' => (float) ($sickLeave->total_entitlement ?? 0),
                        'used' => (float) ($sickLeave->used_days ?? 0),
                        'pending' => (float) ($sickLeave->pending_days ?? 0),
                        'remaining' => (float) ($sickLeave->remaining_days ?? 0),
                    ],
                    'special_leave' => [
                        'id' => $specialLeave->id ?? null,
                        'total' => (float) ($specialLeave->total_entitlement ?? 0),
                        'used' => (float) ($specialLeave->used_days ?? 0),
                        'pending' => (float) ($specialLeave->pending_days ?? 0),
                        'remaining' => (float) ($specialLeave->remaining_days ?? 0),
                    ],

                    // Summary
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
     * Get employee balance by ID (Admin/HR only)
     * GET /api/employees/{employeeId}/leave-balance
     */
    public function getEmployeeBalance(Request $request, $employeeId): JsonResponse
    {
        try {
            Log::info('📊 Fetching employee balance for: ' . $employeeId);

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
                'annual_leave' => [
                    'id' => $annualLeave->id ?? null,
                    'total' => (float) ($annualLeave->total_entitlement ?? 0),
                    'used' => (float) ($annualLeave->used_days ?? 0),
                    'pending' => (float) ($annualLeave->pending_days ?? 0),
                    'remaining' => (float) ($annualLeave->remaining_days ?? 0),
                ],
                'sick_leave' => [
                    'id' => $sickLeave->id ?? null,
                    'total' => (float) ($sickLeave->total_entitlement ?? 0),
                    'used' => (float) ($sickLeave->used_days ?? 0),
                    'pending' => (float) ($sickLeave->pending_days ?? 0),
                    'remaining' => (float) ($sickLeave->remaining_days ?? 0),
                ],
                'special_leave' => [
                    'id' => $specialLeave->id ?? null,
                    'total' => (float) ($specialLeave->total_entitlement ?? 0),
                    'used' => (float) ($specialLeave->used_days ?? 0),
                    'pending' => (float) ($specialLeave->pending_days ?? 0),
                    'remaining' => (float) ($specialLeave->remaining_days ?? 0),
                ],
                'summary' => [
                    'total_entitlement' => array_sum(array_column($balances, 'total_entitlement')),
                    'used_days' => array_sum(array_column($balances, 'used_days')),
                    'pending_days' => array_sum(array_column($balances, 'pending_days')),
                    'remaining_days' => array_sum(array_column($balances, 'remaining_days')),
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
     * Get single balance detail for editing (Admin/HR only)
     * GET /api/employees/leave-balance/{id}
     */
    public function getBalanceDetail($id): JsonResponse
    {
        try {
            Log::info('📊 Fetching balance detail: ' . $id);

            $balance = LeaveBalance::with([
                'employee:id,first_name,last_name,employee_id',
                'leaveType:id,name,code',
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
                'data' => $balance,
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
     * Update leave balance (Admin/HR only)
     * PUT /api/employees/leave-balance/{id}
     */
    public function updateBalance(Request $request, $id): JsonResponse
    {
        try {
            Log::info('📝 Updating leave balance: ' . $id);

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
            $oldTotal = $balance->total_entitlement;
            $newTotal = (float) $request->total_entitlement;

            DB::beginTransaction();

            try {
                // Update balance
                $balance->total_entitlement = $newTotal;
                $balance->manual_adjustment = $newTotal - $balance->base_entitlement;
                $balance->adjustment_reason = $request->adjustment_reason;
                $balance->adjusted_by = $user->id;
                $balance->adjusted_at = now();

                // Recalculate remaining
                $balance->remaining_days = $newTotal - $balance->used_days - $balance->pending_days;
                $balance->save();

                DB::commit();

                Log::info('✅ Balance updated: ' . $balance->id . ' by user: ' . $user->id);

                return response()->json([
                    'status' => 'success',
                    'message' => 'Leave balance updated successfully',
                    'data' => [
                        'id' => $balance->id,
                        'employee_name' => $balance->employee->first_name . ' ' . $balance->employee->last_name,
                        'leave_type' => $balance->leaveType->name,
                        'old_total' => $oldTotal,
                        'new_total' => $newTotal,
                        'old_remaining' => $oldRemaining,
                        'new_remaining' => $balance->remaining_days,
                        'adjustment_reason' => $request->adjustment_reason,
                        'adjusted_by' => $user->first_name . ' ' . $user->last_name,
                        'adjusted_at' => now()->format('Y-m-d H:i:s'),
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
     * Get adjustment history for employee
     * GET /api/employees/leave-balance/{employeeId}/history
     */
    public function getAdjustmentHistory($employeeId): JsonResponse
    {
        try {
            Log::info('📊 Fetching adjustment history for employee: ' . $employeeId);

            $balances = LeaveBalance::where('employee_id', $employeeId)
                ->where(function ($q) {
                    $q->whereNotNull('adjusted_by')
                        ->orWhere('manual_adjustment', '!=', 0);
                })
                ->with(['leaveType', 'adjustedBy'])
                ->orderBy('adjusted_at', 'desc')
                ->get();

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
     * POST /api/employees/generate-balance
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Generating balance');

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

            Log::info('✅ Balance generated for employee: ' . $employeeId);

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
            Log::info('📝 Generating balances for all employees');

            $employees = Employee::where('status', 'active')->get();
            $count = 0;
            $failed = 0;

            foreach ($employees as $employee) {
                try {
                    $this->balanceService->ensureBalanceExists($employee);
                    $count++;
                } catch (\Exception $e) {
                    $failed++;
                    Log::error('Failed for employee ' . $employee->id . ': ' . $e->getMessage());
                }
            }

            Log::info('✅ Generated balances: ' . $count . ' success, ' . $failed . ' failed');

            return response()->json([
                'status' => 'success',
                'message' => "Balance generated for {$count} employees",
                'data' => [
                    'processed' => $count,
                    'failed' => $failed,
                    'total' => $employees->count()
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
     * POST /api/employees/process-carry-forward
     */
    public function processCarryForward(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Processing carry forward');

            $year = $request->year ?? date('Y') - 1;
            $processed = $this->balanceService->processCarryForward($year);

            Log::info('✅ Processed ' . $processed . ' employees');

            return response()->json([
                'status' => 'success',
                'message' => "Processed {$processed} employees for carry forward from {$year} to " . ($year + 1),
                'data' => [
                    'year' => $year,
                    'next_year' => $year + 1,
                    'processed' => $processed,
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
     * Get leave balance summary for dashboard (Admin/HR only)
     * GET /api/employees/leave-balance-summary
     */
    public function getBalanceSummary(Request $request): JsonResponse
    {
        try {
            Log::info('📊 Fetching leave balance summary');

            $year = $request->year ?? date('Y');

            // Get all leave types
            $leaveTypes = LeaveType::where('is_active', true)->get();

            // Get all active employees
            $totalEmployees = Employee::where('status', 'active')->count();

            $summary = [];

            foreach ($leaveTypes as $leaveType) {
                $balances = LeaveBalance::where('year', $year)
                    ->where('leave_type_id', $leaveType->id)
                    ->get();

                $totalEntitlement = $balances->sum('total_entitlement');
                $totalUsed = $balances->sum('used_days');
                $totalPending = $balances->sum('pending_days');
                $totalRemaining = $balances->sum('remaining_days');

                $summary[] = [
                    'leave_type_id' => $leaveType->id,
                    'leave_type' => $leaveType->name,
                    'leave_code' => $leaveType->code,
                    'total_entitlement' => (float) $totalEntitlement,
                    'used_days' => (float) $totalUsed,
                    'pending_days' => (float) $totalPending,
                    'remaining_days' => (float) $totalRemaining,
                ];
            }

            $totalEntitlementAll = array_sum(array_column($summary, 'total_entitlement'));
            $totalUsedAll = array_sum(array_column($summary, 'used_days'));
            $totalPendingAll = array_sum(array_column($summary, 'pending_days'));
            $totalRemainingAll = array_sum(array_column($summary, 'remaining_days'));

            return response()->json([
                'status' => 'success',
                'data' => [
                    'total_employees' => $totalEmployees,
                    'year' => $year,
                    'leave_summary' => $summary,
                    'overall_summary' => [
                        'total_entitlement' => (float) $totalEntitlementAll,
                        'used_days' => (float) $totalUsedAll,
                        'pending_days' => (float) $totalPendingAll,
                        'remaining_days' => (float) $totalRemainingAll,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching balance summary: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balance summary: ' . $e->getMessage()
            ], 500);
        }
    }
}