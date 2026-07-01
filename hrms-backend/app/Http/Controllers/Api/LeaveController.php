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
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

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

    /**
     * Get leave types
     */
    public function leaveTypes(): JsonResponse
    {
        try {
            $types = LeaveType::where('is_active', true)->get();
            return $this->success($types, 'Leave types fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching leave types: ' . $e->getMessage());
            return $this->error('Failed to fetch leave types: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get leave balance
     */
    public function balance(Request $request): JsonResponse
    {
        try {
            $employeeId = $request->employee_id ?? $request->user()->id;
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
                        'base_entitlement' => $balance->base_entitlement ?? 0,
                        'seniority_bonus' => $balance->seniority_bonus ?? 0,
                        'carry_forward' => $balance->carry_forward ?? 0,
                        'replacement_days' => $balance->replacement_days ?? 0,
                        'total_entitlement' => $balance->total_entitlement ?? 0,
                        'used_days' => $balance->used_days ?? 0,
                        'pending_days' => $balance->pending_days ?? 0,
                        'remaining_days' => $balance->remaining_days ?? 0,
                        'years_of_service' => $yearsOfService,
                    ];
                }),
                'employee' => [
                    'id' => $employee->id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'hire_date' => $employee->hire_date,
                    'years_of_service' => $yearsOfService,
                ],
            ];

            return $this->success($result, 'Leave balance fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching balance: ' . $e->getMessage());
            return $this->error('Failed to load balance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all employees leave balances (Admin/HR only)
     */
    public function allBalances(Request $request): JsonResponse
    {
        try {
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

            foreach ($employees as $employee) {
                $employee->years_of_service = Carbon::parse($employee->hire_date)->diffInYears(Carbon::now());
            }

            return $this->success($employees, 'All balances fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching all balances: ' . $e->getMessage());
            return $this->error('Failed to fetch balances: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get list of leaves
     */
    public function index(Request $request): JsonResponse
    {
        try {
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

            return $this->success($leaves, 'Leaves fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching leaves: ' . $e->getMessage());
            return $this->error('Failed to fetch leaves: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single leave
     */
    public function show($id): JsonResponse
    {
        try {
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
            Log::error('Error fetching leave: ' . $e->getMessage());
            return $this->error('Failed to fetch leave details: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create leave request
     */
    public function store(Request $request): JsonResponse
    {
        try {
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

            $this->balanceService->ensureBalanceExists($employee);
            $leave = $this->leaveService->createLeave($employee, $request->all());

            return $this->success($leave->load('leaveType'), 'Leave request submitted!', 201);
        } catch (\Exception $e) {
            Log::error('Error creating leave: ' . $e->getMessage());
            return $this->error('Failed to submit leave: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve leave
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['employee'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $user = $request->user();

            if ($user->id === $leave->employee_id) {
                return $this->unauthorized('You cannot approve your own leave request');
            }

            $this->leaveService->approveLeave($leave, $user);

            return $this->success(null, 'Leave approved successfully');
        } catch (\Exception $e) {
            Log::error('Error approving leave: ' . $e->getMessage());
            return $this->error('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject leave
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['employee'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $user = $request->user();

            $this->leaveService->rejectLeave($leave, $user, $request->reason);

            return $this->success(null, 'Leave rejected successfully');
        } catch (\Exception $e) {
            Log::error('Error rejecting leave: ' . $e->getMessage());
            return $this->error('Failed to reject: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel leave
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $user = $request->user();

            $this->leaveService->cancelLeave($leave, $user);

            return $this->success(null, 'Leave cancelled successfully');
        } catch (\Exception $e) {
            Log::error('Error cancelling leave: ' . $e->getMessage());
            return $this->error('Failed to cancel: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get pending leave requests
     */
    public function pendingRequests(Request $request): JsonResponse
    {
        try {
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

            return $this->success($leaves, 'Pending requests fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching pending requests: ' . $e->getMessage());
            return $this->error('Failed to fetch pending requests: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate balance
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            $employeeId = $request->employee_id ?? $request->user()->id;
            $employee = Employee::find($employeeId);

            if (!$employee) {
                return $this->notFound('Employee not found');
            }

            $this->balanceService->ensureBalanceExists($employee);

            return $this->success(null, 'Leave balance generated successfully');
        } catch (\Exception $e) {
            Log::error('Error generating balance: ' . $e->getMessage());
            return $this->error('Failed to generate balance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Process carry forward
     */
    public function processCarryForward(Request $request): JsonResponse
    {
        try {
            $year = $request->year ?? date('Y') - 1;
            $processed = $this->balanceService->processCarryForward($year);

            return $this->success(
                null,
                "Processed {$processed} employees for carry forward from {$year} to " . ($year + 1)
            );
        } catch (\Exception $e) {
            Log::error('Error processing carry forward: ' . $e->getMessage());
            return $this->error('Failed to process carry forward: ' . $e->getMessage(), 500);
        }
    }

    // ==========================================
    // REPLACEMENT LEAVE METHODS
    // ==========================================

    /**
     * Get replacement leaves list
     */
    public function replacementList(Request $request): JsonResponse
    {
        try {
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

            return $this->success($replacements, 'Replacement leaves fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching replacement leaves: ' . $e->getMessage());
            return $this->error('Failed to fetch replacement leaves: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get pending replacements
     */
    public function pendingReplacements(Request $request): JsonResponse
    {
        try {
            $query = ReplacementLeave::with([
                'employee:id,first_name,last_name,employee_id,manager_id',
                'approvedBy:id,first_name,last_name'
            ])->where('status', 'pending');

            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            $perPage = $request->input('per_page', 15);
            $replacements = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return $this->success($replacements, 'Pending replacements fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching pending replacements: ' . $e->getMessage());
            return $this->error('Failed to fetch pending replacements: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Request replacement leave
     */
    public function requestReplacement(Request $request): JsonResponse
    {
        try {
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
            $replacement = $this->replacementService->createRequest($employee, $request->all());

            return $this->success(
                $replacement->load('employee'),
                'Replacement leave request submitted!',
                201
            );
        } catch (\Exception $e) {
            Log::error('Error requesting replacement: ' . $e->getMessage());
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Approve replacement leave
     */
    public function approveReplacement(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::with(['employee'])->find($id);

            if (!$replacement) {
                return $this->notFound('Replacement not found');
            }

            $user = $request->user();

            if ($user->id === $replacement->employee_id) {
                return $this->unauthorized('You cannot approve your own replacement request');
            }

            $this->replacementService->approve($replacement, $user);

            return $this->success(
                null,
                "Replacement approved! +{$replacement->days_to_add} day(s) added to Annual Leave."
            );
        } catch (\Exception $e) {
            Log::error('Error approving replacement: ' . $e->getMessage());
            return $this->error('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject replacement leave
     */
    public function rejectReplacement(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::find($id);

            if (!$replacement) {
                return $this->notFound('Replacement not found');
            }

            $this->replacementService->reject($replacement, $request->reason);

            return $this->success(null, 'Replacement leave rejected');
        } catch (\Exception $e) {
            Log::error('Error rejecting replacement: ' . $e->getMessage());
            return $this->error('Failed to reject: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel replacement leave
     */
    public function cancelReplacement(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::with(['employee'])->find($id);

            if (!$replacement) {
                return $this->notFound('Replacement not found');
            }

            $user = $request->user();

            $this->replacementService->cancel($replacement, $user, $request->reason);

            return $this->success(null, 'Replacement request cancelled');
        } catch (\Exception $e) {
            Log::error('Error cancelling replacement: ' . $e->getMessage());
            return $this->error($e->getMessage(), 422);
        }
    }
}
