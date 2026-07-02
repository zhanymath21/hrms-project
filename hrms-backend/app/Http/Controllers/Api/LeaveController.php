<?php
// app/Http/Controllers/Api/LeaveController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\ReplacementLeave;
use App\Services\Leave\LeaveService;
use App\Services\Leave\LeaveBalanceService;
use App\Services\Leave\ReplacementLeaveService;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class LeaveController extends Controller
{
    use ApiResponseTrait;

    protected LeaveService $leaveService;
    protected LeaveBalanceService $balanceService;
    protected ReplacementLeaveService $replacementService;

    public function __construct(
        LeaveService $leaveService,
        LeaveBalanceService $balanceService,
        ReplacementLeaveService $replacementService
    ) {
        $this->leaveService = $leaveService;
        $this->balanceService = $balanceService;
        $this->replacementService = $replacementService;
    }

    // ==========================================
    // LEAVE TYPES
    // ==========================================

    /**
     * Get leave types
     * GET /api/leave-types
     */
    public function leaveTypes(): JsonResponse
    {
        try {
            Log::info('📋 Fetching leave types');

            $types = LeaveType::where('is_active', true)->get();

            if ($types->isEmpty()) {
                Log::warning('No leave types found, creating defaults');
                $this->createDefaultLeaveTypes();
                $types = LeaveType::where('is_active', true)->get();
            }

            Log::info('✅ Found ' . $types->count() . ' leave types');

            return $this->success($types, 'Leave types fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching leave types: ' . $e->getMessage());
            return $this->error('Failed to fetch leave types: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create default leave types
     */
    private function createDefaultLeaveTypes(): void
    {
        $defaultTypes = [
            ['code' => 'AL', 'name' => 'Annual Leave', 'days_per_year' => 12, 'is_paid' => true, 'allow_carry_forward' => true, 'max_carry_forward_days' => 6, 'is_active' => true],
            ['code' => 'SL', 'name' => 'Sick Leave', 'days_per_year' => 14, 'is_paid' => true, 'allow_carry_forward' => false, 'max_carry_forward_days' => 0, 'is_active' => true],
            ['code' => 'SPL', 'name' => 'Special Leave', 'days_per_year' => 3, 'is_paid' => true, 'allow_carry_forward' => false, 'max_carry_forward_days' => 0, 'is_active' => true],
            ['code' => 'UL', 'name' => 'Unpaid Leave', 'days_per_year' => 0, 'is_paid' => false, 'allow_carry_forward' => false, 'max_carry_forward_days' => 0, 'is_active' => true],
        ];

        foreach ($defaultTypes as $type) {
            LeaveType::firstOrCreate(
                ['code' => $type['code']],
                $type
            );
        }

        Log::info('✅ Default leave types created');
    }

    // ==========================================
    // LEAVE BALANCE
    // ==========================================

    /**
     * Get leave balance for employee
     * GET /api/leaves/balance
     */
    public function balance(Request $request): JsonResponse
    {
        try {
            Log::info('📊 Fetching leave balance');

            $employeeId = $request->employee_id ?? $request->user()->id;
            Log::info('Employee ID: ' . $employeeId);

            $employee = Employee::find($employeeId);

            if (!$employee) {
                Log::error('Employee not found: ' . $employeeId);
                return $this->notFound('Employee not found');
            }

            // Ensure balance exists
            $this->balanceService->ensureBalanceExists($employee);

            $balances = LeaveBalance::where('employee_id', $employeeId)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            Log::info('✅ Found ' . $balances->count() . ' balances');

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

            return $this->success($result, 'Leave balance fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching balance: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return $this->error('Failed to load balance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all employees leave balances (Admin/HR only)
     * GET /api/leaves/all-balances
     */
    public function allBalances(Request $request): JsonResponse
    {
        try {
            Log::info('📊 Fetching all employees balances');

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

            Log::info('✅ Found ' . $employees->total() . ' employees');

            return $this->success($employees, 'All balances fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching all balances: ' . $e->getMessage());
            return $this->error('Failed to fetch balances: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get balance detail by ID (Admin/HR only)
     * GET /api/leaves/balance/{id}
     */
    public function getBalanceDetail($id): JsonResponse
    {
        try {
            Log::info('📊 Fetching balance detail: ' . $id);

            $balance = LeaveBalance::with([
                'employee:id,first_name,last_name,employee_id,department_id',
                'employee.department:id,name',
                'leaveType:id,name,code,days_per_year',
                'adjustedBy:id,first_name,last_name'
            ])->find($id);

            if (!$balance) {
                return $this->notFound('Balance not found');
            }

            return $this->success($balance, 'Balance detail fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching balance detail: ' . $e->getMessage());
            return $this->error('Failed to fetch balance detail: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update leave balance (Admin/HR only)
     * PUT /api/leaves/balance/{id}
     */
    public function updateBalance(Request $request, $id): JsonResponse
    {
        try {
            Log::info('📝 Updating balance: ' . $id);

            $balance = LeaveBalance::with(['employee', 'leaveType'])->find($id);

            if (!$balance) {
                return $this->notFound('Balance not found');
            }

            $validator = Validator::make($request->all(), [
                'base_entitlement' => 'nullable|numeric|min:0',
                'manual_adjustment' => 'nullable|numeric',
                'adjustment_reason' => 'required_if:manual_adjustment,!=,0|string|min:5',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $user = $request->user();

            if (isset($request->base_entitlement)) {
                $balance->base_entitlement = $request->base_entitlement;
            }

            if (isset($request->manual_adjustment) && $request->manual_adjustment != 0) {
                $balance->manual_adjustment = $request->manual_adjustment;
                $balance->adjustment_reason = $request->adjustment_reason;
                $balance->adjusted_by = $user->id;
                $balance->adjusted_at = now();
            }

            // Recalculate total
            $balance->total_entitlement =
                $balance->base_entitlement +
                $balance->seniority_bonus +
                $balance->carry_forward +
                $balance->replacement_days +
                $balance->manual_adjustment;

            $balance->remaining_days =
                $balance->total_entitlement -
                $balance->used_days -
                $balance->pending_days;

            $balance->save();

            Log::info('✅ Balance updated: ' . $balance->id);

            return $this->success($balance->fresh(), 'Balance updated successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error updating balance: ' . $e->getMessage());
            return $this->error('Failed to update balance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get adjustment history for employee
     * GET /api/leaves/balance/{employeeId}/history
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

            return $this->success($balances, 'Adjustment history fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching adjustment history: ' . $e->getMessage());
            return $this->error('Failed to fetch history: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate balance for employee
     * POST /api/leaves/generate-balance
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Generating balance');

            $employeeId = $request->employee_id ?? $request->user()->id;
            $employee = Employee::find($employeeId);

            if (!$employee) {
                return $this->notFound('Employee not found');
            }

            $this->balanceService->ensureBalanceExists($employee);

            Log::info('✅ Balance generated for employee: ' . $employeeId);

            return $this->success(null, 'Leave balance generated successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error generating balance: ' . $e->getMessage());
            return $this->error('Failed to generate balance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Process carry forward
     * POST /api/leaves/process-carry-forward
     */
    public function processCarryForward(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Processing carry forward');

            $year = $request->year ?? date('Y') - 1;
            $processed = $this->balanceService->processCarryForward($year);

            Log::info('✅ Processed ' . $processed . ' employees');

            return $this->success(
                null,
                "Processed {$processed} employees for carry forward from {$year} to " . ($year + 1)
            );
        } catch (\Exception $e) {
            Log::error('❌ Error processing carry forward: ' . $e->getMessage());
            return $this->error('Failed to process carry forward: ' . $e->getMessage(), 500);
        }
    }

    // ==========================================
    // LEAVE REQUESTS
    // ==========================================

    /**
     * Get list of leave requests
     * GET /api/leaves
     */
    public function index(Request $request): JsonResponse
    {
        try {
            Log::info('📋 Fetching leave requests');

            $query = Leave::with([
                'employee:id,first_name,last_name,employee_id,department_id,manager_id',
                'employee.department:id,name',
                'leaveType:id,name,code',
                'approvedBy:id,first_name,last_name'
            ]);

            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('start_date')) {
                $query->whereDate('start_date', '>=', $request->start_date);
            }

            if ($request->filled('end_date')) {
                $query->whereDate('end_date', '<=', $request->end_date);
            }

            if ($request->filled('leave_type_id')) {
                $query->where('leave_type_id', $request->leave_type_id);
            }

            $perPage = $request->input('per_page', 15);
            $leaves = $query->orderBy('created_at', 'desc')->paginate($perPage);

            Log::info('✅ Found ' . $leaves->total() . ' leave requests');

            return $this->success($leaves, 'Leaves fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching leaves: ' . $e->getMessage());
            return $this->error('Failed to fetch leaves: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get pending leave requests
     * GET /api/leaves/pending
     */
    public function pendingRequests(Request $request): JsonResponse
    {
        try {
            Log::info('📋 Fetching pending leave requests');

            $query = Leave::with([
                'employee:id,first_name,last_name,employee_id,department_id,manager_id',
                'employee.department:id,name',
                'leaveType:id,name,code'
            ])->where('status', 'pending');

            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            $perPage = $request->input('per_page', 15);
            $leaves = $query->orderBy('created_at', 'desc')->paginate($perPage);

            Log::info('✅ Found ' . $leaves->total() . ' pending requests');

            return $this->success($leaves, 'Pending requests fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching pending requests: ' . $e->getMessage());
            return $this->error('Failed to fetch pending requests: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single leave request
     * GET /api/leaves/{id}
     */
    public function show($id): JsonResponse
    {
        try {
            Log::info('📋 Fetching leave request: ' . $id);

            $leave = Leave::with([
                'employee:id,first_name,last_name,employee_id,department_id',
                'employee.department:id,name',
                'leaveType:id,name,code,days_per_year',
                'approvedBy:id,first_name,last_name'
            ])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            return $this->success($leave, 'Leave details fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching leave: ' . $e->getMessage());
            return $this->error('Failed to fetch leave details: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create leave request
     * POST /api/leaves
     */
    public function store(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Creating leave request');

            $validator = Validator::make($request->all(), [
                'leave_type_id' => 'required|exists:leave_types,id',
                'start_date' => 'required|date|after_or_equal:today',
                'end_date' => 'required|date|after_or_equal:start_date',
                'reason' => 'required|string|min:5',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $employee = $request->user();

            if (!$employee) {
                return $this->error('User not authenticated', 401);
            }

            $leave = $this->leaveService->createLeave($employee, $request->all());

            Log::info('✅ Leave request created: ' . $leave->id);

            return $this->success($leave->load('leaveType'), 'Leave request submitted!', 201);
        } catch (\Exception $e) {
            Log::error('❌ Error creating leave: ' . $e->getMessage());
            return $this->error('Failed to submit leave: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve leave request
     * PUT /api/leaves/{id}/approve
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            Log::info('📝 Approving leave: ' . $id);

            $leave = Leave::with(['employee'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $user = $request->user();

            if ($user->id === $leave->employee_id) {
                return $this->unauthorized('You cannot approve your own leave request');
            }

            $this->leaveService->approveLeave($leave, $user);

            Log::info('✅ Leave approved: ' . $id);

            return $this->success(null, 'Leave approved successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error approving leave: ' . $e->getMessage());
            return $this->error('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject leave request
     * PUT /api/leaves/{id}/reject
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            Log::info('📝 Rejecting leave: ' . $id);

            $leave = Leave::with(['employee'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $user = $request->user();

            $this->leaveService->rejectLeave($leave, $user, $request->reason);

            Log::info('✅ Leave rejected: ' . $id);

            return $this->success(null, 'Leave rejected successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error rejecting leave: ' . $e->getMessage());
            return $this->error('Failed to reject: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel leave request
     * PUT /api/leaves/{id}/cancel
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            Log::info('📝 Cancelling leave: ' . $id);

            $leave = Leave::find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $user = $request->user();

            $this->leaveService->cancelLeave($leave, $user);

            Log::info('✅ Leave cancelled: ' . $id);

            return $this->success(null, 'Leave cancelled successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error cancelling leave: ' . $e->getMessage());
            return $this->error('Failed to cancel: ' . $e->getMessage(), 500);
        }
    }

    // ==========================================
    // REPLACEMENT LEAVES
    // ==========================================

    /**
     * Get replacement leaves list
     * GET /api/replacement-leaves
     */
    public function replacementList(Request $request): JsonResponse
    {
        try {
            Log::info('📋 Fetching replacement leaves');

            $query = ReplacementLeave::with([
                'employee:id,first_name,last_name,employee_id,manager_id',
                'approvedBy:id,first_name,last_name'
            ]);

            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $perPage = $request->input('per_page', 15);
            $replacements = $query->orderBy('created_at', 'desc')->paginate($perPage);

            Log::info('✅ Found ' . $replacements->total() . ' replacement leaves');

            return $this->success($replacements, 'Replacement leaves fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching replacement leaves: ' . $e->getMessage());
            return $this->error('Failed to fetch replacement leaves: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get pending replacement leaves
     * GET /api/replacement-leaves/pending
     */
    public function pendingReplacements(Request $request): JsonResponse
    {
        try {
            Log::info('📋 Fetching pending replacement leaves');

            $query = ReplacementLeave::with([
                'employee:id,first_name,last_name,employee_id,manager_id',
                'approvedBy:id,first_name,last_name'
            ])->where('status', 'pending');

            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            $perPage = $request->input('per_page', 15);
            $replacements = $query->orderBy('created_at', 'desc')->paginate($perPage);

            Log::info('✅ Found ' . $replacements->total() . ' pending replacements');

            return $this->success($replacements, 'Pending replacements fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching pending replacements: ' . $e->getMessage());
            return $this->error('Failed to fetch pending replacements: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Request replacement leave
     * POST /api/replacement-leaves
     */
    public function requestReplacement(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Creating replacement leave request');

            $validator = Validator::make($request->all(), [
                'work_date' => 'required|date',
                'work_day_type' => 'required|in:weekend,public_holiday',
                'hours_worked' => 'required|integer|min:1|max:12',
                'replacement_date' => 'required|date|after:today',
                'reason' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $employee = $request->user();

            if (!$employee) {
                return $this->error('User not authenticated', 401);
            }

            $replacement = $this->replacementService->createRequest($employee, $request->all());

            Log::info('✅ Replacement request created: ' . $replacement->id);

            return $this->success(
                $replacement->load('employee'),
                'Replacement leave request submitted!',
                201
            );
        } catch (\Exception $e) {
            Log::error('❌ Error creating replacement: ' . $e->getMessage());
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Approve replacement leave
     * PUT /api/replacement-leaves/{id}/approve
     */
    public function approveReplacement(Request $request, $id): JsonResponse
    {
        try {
            Log::info('📝 Approving replacement leave: ' . $id);

            $replacement = ReplacementLeave::with(['employee'])->find($id);

            if (!$replacement) {
                return $this->notFound('Replacement not found');
            }

            $user = $request->user();

            if ($user->id === $replacement->employee_id) {
                return $this->unauthorized('You cannot approve your own replacement request');
            }

            $this->replacementService->approve($replacement, $user);

            Log::info('✅ Replacement approved: ' . $id);

            return $this->success(
                null,
                "Replacement approved! +{$replacement->days_to_add} day(s) added to Annual Leave."
            );
        } catch (\Exception $e) {
            Log::error('❌ Error approving replacement: ' . $e->getMessage());
            return $this->error('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject replacement leave
     * PUT /api/replacement-leaves/{id}/reject
     */
    public function rejectReplacement(Request $request, $id): JsonResponse
    {
        try {
            Log::info('📝 Rejecting replacement leave: ' . $id);

            $replacement = ReplacementLeave::find($id);

            if (!$replacement) {
                return $this->notFound('Replacement not found');
            }

            $this->replacementService->reject($replacement, $request->reason);

            Log::info('✅ Replacement rejected: ' . $id);

            return $this->success(null, 'Replacement leave rejected');
        } catch (\Exception $e) {
            Log::error('❌ Error rejecting replacement: ' . $e->getMessage());
            return $this->error('Failed to reject: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel replacement leave
     * PUT /api/replacement-leaves/{id}/cancel
     */
    public function cancelReplacement(Request $request, $id): JsonResponse
    {
        try {
            Log::info('📝 Cancelling replacement leave: ' . $id);

            $replacement = ReplacementLeave::with(['employee'])->find($id);

            if (!$replacement) {
                return $this->notFound('Replacement not found');
            }

            $user = $request->user();

            $this->replacementService->cancel($replacement, $user, $request->reason);

            Log::info('✅ Replacement cancelled: ' . $id);

            return $this->success(null, 'Replacement request cancelled');
        } catch (\Exception $e) {
            Log::error('❌ Error cancelling replacement: ' . $e->getMessage());
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Get public holidays
     * GET /api/public-holidays
     */
    public function publicHolidays(Request $request): JsonResponse
    {
        try {
            // This would typically fetch from a database or API
            // For now, return sample data
            $year = $request->year ?? date('Y');

            $holidays = [
                [
                    'date' => $year . '-01-01',
                    'name' => 'New Year\'s Day',
                    'type' => 'national',
                ],
                [
                    'date' => $year . '-05-01',
                    'name' => 'Labor Day',
                    'type' => 'national',
                ],
                [
                    'date' => $year . '-08-17',
                    'name' => 'Independence Day',
                    'type' => 'national',
                ],
                [
                    'date' => $year . '-12-25',
                    'name' => 'Christmas Day',
                    'type' => 'national',
                ],
            ];

            return $this->success($holidays, 'Public holidays fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching public holidays: ' . $e->getMessage());
            return $this->error('Failed to fetch public holidays: ' . $e->getMessage(), 500);
        }
    }
}