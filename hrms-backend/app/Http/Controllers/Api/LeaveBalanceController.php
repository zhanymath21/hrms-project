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
     * ==========================================
     * CHECK IF USER IS ADMIN OR HR
     * ==========================================
     */
    private function isAdminOrHR($user): bool
    {
        if (!$user) return false;

        $adminPositions = [
            'HR Manager',
            'HR Officer',
            'HR Assistant',
            'Admin',
            'System Admin',
            'Director',
            'CEO',
            'Manager'
        ];

        // Check by position
        if ($user->position && in_array($user->position->title ?? '', $adminPositions)) {
            return true;
        }

        // Check by role
        if ($user->role && in_array($user->role, ['admin', 'hr', 'manager', 'director'])) {
            return true;
        }

        return false;
    }

    /**
     * ==========================================
     * 1. GET ALL EMPLOYEES LEAVE BALANCES (ADMIN/HR)
     * GET /api/employees/leave-balances
     * ==========================================
     */
    public function allBalances(Request $request): JsonResponse
    {
        try {
            Log::info('📊 Fetching all employees leave balances');

            $user = $request->user();

            // Check if user is Admin/HR
            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized. Only Admin/HR can view all balances.'
                ], 403);
            }

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
                $leaveTypeMap = [];

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
                    $leaveTypeMap[$leaveType->code] = $balanceItem;
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

                    // Quick access by leave code
                    'annual_leave' => $leaveTypeMap['AL'] ?? null,
                    'sick_leave' => $leaveTypeMap['SL'] ?? null,
                    'special_leave' => $leaveTypeMap['SPL'] ?? null,

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
            Log::error($e->getTraceAsString());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch all balances: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ==========================================
     * 2. GET MY LEAVE BALANCE (EMPLOYEE)
     * GET /api/employees/my-leave-balance
     * ==========================================
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

            // Find employee by user_id or email
            $employee = Employee::where('user_id', $user->id)->first();

            if (!$employee) {
                $employee = Employee::where('email', $user->email)->first();
            }

            if (!$employee) {
                Log::error('Employee not found for user: ' . $user->id);
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found. Please contact HR.'
                ], 404);
            }

            Log::info('Employee found: ' . $employee->id . ' - ' . $employee->first_name . ' ' . $employee->last_name);

            // Ensure balance exists
            $this->balanceService->ensureBalanceExists($employee);

            $balances = LeaveBalance::where('employee_id', $employee->id)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            Log::info('Found ' . $balances->count() . ' balances');

            $yearsOfService = Carbon::parse($employee->hire_date)->diffInYears(Carbon::now());

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
                    'id' => $employee->id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'employee_id' => $employee->employee_id,
                    'hire_date' => $employee->hire_date,
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
     * ==========================================
     * 3. GET EMPLOYEE BALANCE BY ID (ADMIN/HR)
     * GET /api/employees/{employeeId}/leave-balance
     * ==========================================
     */
    public function getEmployeeBalance(Request $request, $employeeId): JsonResponse
    {
        try {
            Log::info('📊 Fetching employee balance for: ' . $employeeId);

            $user = $request->user();

            // Check if user is Admin/HR
            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized. Only Admin/HR can view other employee balances.'
                ], 403);
            }

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
     * ==========================================
     * 4. GET SINGLE BALANCE DETAIL (ADMIN/HR)
     * GET /api/employees/leave-balance/{id}
     * ==========================================
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
     * ==========================================
     * 5. UPDATE LEAVE BALANCE (ADMIN/HR)
     * PUT /api/employees/leave-balance/{id}
     * ==========================================
     */
    public function updateBalance(Request $request, $id): JsonResponse
    {
        try {
            Log::info('📝 Updating leave balance: ' . $id);

            $user = $request->user();

            // Check if user is Admin/HR
            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized. Only Admin/HR can update balances.'
                ], 403);
            }

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
     * ==========================================
     * 6. GET ADJUSTMENT HISTORY (ADMIN/HR)
     * GET /api/employees/leave-balance/{employeeId}/history
     * ==========================================
     */
    public function getAdjustmentHistory($employeeId): JsonResponse
    {
        try {
            Log::info('📊 Fetching adjustment history for employee: ' . $employeeId);

            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized. Only Admin/HR can view adjustment history.'
                ], 403);
            }

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
     * ==========================================
     * 7. GENERATE BALANCE FOR EMPLOYEE (ADMIN/HR)
     * POST /api/employees/generate-balance
     * ==========================================
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Generating balance');

            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized. Only Admin/HR can generate balances.'
                ], 403);
            }

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
     * ==========================================
     * 8. GENERATE BALANCES FOR ALL EMPLOYEES (ADMIN/HR)
     * POST /api/employees/generate-all-balances
     * ==========================================
     */
    public function generateAllBalances(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Generating balances for all employees');

            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized. Only Admin/HR can generate all balances.'
                ], 403);
            }

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
     * ==========================================
     * 9. PROCESS CARRY FORWARD (ADMIN/HR)
     * POST /api/employees/process-carry-forward
     * ==========================================
     */
    public function processCarryForward(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Processing carry forward');

            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized. Only Admin/HR can process carry forward.'
                ], 403);
            }

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
     * ==========================================
     * 10. GET BALANCE SUMMARY (ADMIN/HR)
     * GET /api/employees/leave-balance-summary
     * ==========================================
     */
    public function getBalanceSummary(Request $request): JsonResponse
    {
        try {
            Log::info('📊 Fetching leave balance summary');

            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized. Only Admin/HR can view balance summary.'
                ], 403);
            }

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
