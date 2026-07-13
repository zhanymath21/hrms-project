<?php
// app/Http/Controllers/Api/LeaveController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\LeaveBalance;
use App\Services\Leave\LeaveApprovalService;
use App\Services\Leave\LeaveBalanceService;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class LeaveController extends Controller
{
    use ApiResponseTrait;

    protected LeaveApprovalService $approvalService;
    protected LeaveBalanceService $balanceService;

    public function __construct(
        LeaveApprovalService $approvalService,
        LeaveBalanceService $balanceService
    ) {
        $this->approvalService = $approvalService;
        $this->balanceService = $balanceService;
    }

    /**
     * Get leave types
     * GET /api/leaves/types
     */
    public function leaveTypes(): JsonResponse
    {
        try {
            $types = LeaveType::where('is_active', true)->get();

            if ($types->isEmpty()) {
                $this->createDefaultLeaveTypes();
                $types = LeaveType::where('is_active', true)->get();
            }

            return $this->success($types, 'Leave types fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching leave types: ' . $e->getMessage());
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

    /**
     * Get leave balance
     * GET /api/leaves/balance
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
            Log::error('Error fetching balance: ' . $e->getMessage());
            return $this->error('Failed to load balance: ' . $e->getMessage(), 500);
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
                'leaveType:id,name,code',
                'approvals.approver:id,first_name,last_name',
            ])->where('status', 'pending');

            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            if ($request->filled('start_date')) {
                $query->whereDate('start_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->whereDate('end_date', '<=', $request->end_date);
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
     * Create leave request with attachment
     * POST /api/leaves
     */
    public function store(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Creating leave request');
            Log::info('Request data:', $request->all());

            // 🔥 PERBAIKI VALIDASI - TAMBAHKAN ERROR MESSAGE YANG JELAS
            $validator = Validator::make($request->all(), [
                'leave_type_id' => 'required|exists:leave_types,id',
                'start_date' => 'required|date|after_or_equal:today',
                'end_date' => 'required|date|after_or_equal:start_date',
                'reason' => 'required|string|min:5',
                'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:5120',
            ], [
                'leave_type_id.required' => 'Leave type is required',
                'leave_type_id.exists' => 'Selected leave type is invalid',
                'start_date.required' => 'Start date is required',
                'start_date.after_or_equal' => 'Start date must be today or later',
                'end_date.required' => 'End date is required',
                'end_date.after_or_equal' => 'End date must be after start date',
                'reason.required' => 'Reason is required',
                'reason.min' => 'Reason must be at least 5 characters',
                'attachment.mimes' => 'Attachment must be PDF, JPG, PNG, or DOC file',
                'attachment.max' => 'Attachment size must be less than 5MB',
            ]);

            if ($validator->fails()) {
                Log::error('Validation failed:', $validator->errors()->toArray());
                return $this->validationError($validator->errors());
            }

            $employee = $request->user();

            if (!$employee) {
                return $this->error('User not authenticated', 401);
            }

            // Calculate total days
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);
            $totalDays = $this->calculateWorkingDays($startDate, $endDate);

            Log::info('Total days: ' . $totalDays);

            // Check balance
            $balance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $request->leave_type_id,
                'year' => date('Y'),
            ])->first();

            if (!$balance) {
                // Try to generate balance
                $this->balanceService->ensureBalanceExists($employee);
                $balance = LeaveBalance::where([
                    'employee_id' => $employee->id,
                    'leave_type_id' => $request->leave_type_id,
                    'year' => date('Y'),
                ])->first();
            }

            if (!$balance) {
                return $this->error('Leave balance not found. Please contact HR.', 422);
            }

            if ($balance->remaining_days < $totalDays) {
                return $this->error(
                    "Insufficient balance! Need {$totalDays} days, available: " . ($balance->remaining_days ?? 0),
                    422
                );
            }

            // Handle attachment
            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $this->approvalService->uploadAttachment($request->file('attachment'));
                Log::info('Attachment uploaded: ' . $attachmentPath);
            }

            $data = $request->all();
            $data['total_days'] = $totalDays;
            $data['attachment'] = $attachmentPath;

            $leave = $this->approvalService->createLeave($employee, $data);

            // Update balance
            $this->balanceService->updateBalanceAfterLeave(
                $employee,
                LeaveType::find($request->leave_type_id),
                date('Y'),
                'pending',
                $totalDays
            );

            return $this->success(
                $leave->load(['leaveType', 'approvals.approver']),
                'Leave request submitted!',
                201
            );
        } catch (\Exception $e) {
            Log::error('❌ Error creating leave: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return $this->error('Failed to submit leave: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get pending approvals for current user
     * GET /api/leaves/pending-approvals
     */
    public function pendingApprovals(Request $request): JsonResponse
    {
        try {
            Log::info('📋 Fetching pending approvals for user: ' . $request->user()->id);

            $user = $request->user();

            // Get all pending approvals where current user is the approver
            $approvals = LeaveApproval::with([
                'leave:id,employee_id,leave_type_id,start_date,end_date,total_days,reason,status,attachment,approval_level,total_approval_levels,created_at',
                'leave.employee:id,first_name,last_name,employee_id',
                'leave.leaveType:id,name,code',
                'approver:id,first_name,last_name',
            ])
                ->where('approver_id', $user->id)
                ->where('status', 'pending')
                ->orderBy('created_at', 'asc')
                ->get();

            Log::info('✅ Found ' . $approvals->count() . ' pending approvals');

            // Format response
            $result = $approvals->map(function ($approval) {
                return [
                    'id' => $approval->id,
                    'level' => $approval->level,
                    'status' => $approval->status,
                    'notes' => $approval->notes,
                    'approved_at' => $approval->approved_at,
                    'created_at' => $approval->created_at,
                    'leave_id' => $approval->leave_id,
                    'leave' => $approval->leave ? [
                        'id' => $approval->leave->id,
                        'employee_id' => $approval->leave->employee_id,
                        'employee' => $approval->leave->employee ? [
                            'id' => $approval->leave->employee->id,
                            'first_name' => $approval->leave->employee->first_name,
                            'last_name' => $approval->leave->employee->last_name,
                            'employee_id' => $approval->leave->employee->employee_id,
                        ] : null,
                        'leave_type_id' => $approval->leave->leave_type_id,
                        'leave_type' => $approval->leave->leaveType ? [
                            'id' => $approval->leave->leaveType->id,
                            'name' => $approval->leave->leaveType->name,
                            'code' => $approval->leave->leaveType->code,
                        ] : null,
                        'start_date' => $approval->leave->start_date,
                        'end_date' => $approval->leave->end_date,
                        'total_days' => $approval->leave->total_days,
                        'reason' => $approval->leave->reason,
                        'attachment' => $approval->leave->attachment,
                        'status' => $approval->leave->status,
                        'approval_level' => $approval->leave->approval_level,
                        'total_approval_levels' => $approval->leave->total_approval_levels,
                        'created_at' => $approval->leave->created_at,
                    ] : null,
                    'approver' => $approval->approver ? [
                        'id' => $approval->approver->id,
                        'first_name' => $approval->approver->first_name,
                        'last_name' => $approval->approver->last_name,
                    ] : null,
                ];
            });

            return $this->success($result, 'Pending approvals fetched');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching pending approvals: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return $this->error('Failed to fetch pending approvals: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve leave at level
     * PUT /api/leaves/{id}/approve
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['approvals', 'employee', 'leaveType'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $employee = $request->user();

            // Check if user is authorized to approve
            $approval = $leave->approvals()->where('approver_id', $employee->id)
                ->where('status', 'pending')
                ->first();

            if (!$approval) {
                return $this->unauthorized('You are not authorized to approve this leave');
            }

            $leave = $this->approvalService->approveLeave($leave, $employee, $request->only(['notes']));

            // If fully approved, update balance
            if ($leave->status === 'approved') {
                $this->balanceService->updateBalanceAfterLeave(
                    $leave->employee,
                    $leave->leaveType,
                    date('Y', strtotime($leave->start_date)),
                    'approve',
                    $leave->total_days
                );
            }

            return $this->success($leave, 'Leave approved successfully');
        } catch (\Exception $e) {
            Log::error('Error approving leave: ' . $e->getMessage());
            return $this->error('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject leave
     * PUT /api/leaves/{id}/reject
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['approvals', 'employee', 'leaveType'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $employee = $request->user();

            // Check if user is authorized to reject
            $approval = $leave->approvals()->where('approver_id', $employee->id)
                ->where('status', 'pending')
                ->first();

            if (!$approval) {
                return $this->unauthorized('You are not authorized to reject this leave');
            }

            $validator = Validator::make($request->all(), [
                'rejection_reason' => 'required|string|min:5',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $leave = $this->approvalService->rejectLeave($leave, $employee, $request->rejection_reason);

            // Return days to balance
            $this->balanceService->updateBalanceAfterLeave(
                $leave->employee,
                $leave->leaveType,
                date('Y', strtotime($leave->start_date)),
                'reject',
                $leave->total_days
            );

            return $this->success($leave, 'Leave rejected successfully');
        } catch (\Exception $e) {
            Log::error('Error rejecting leave: ' . $e->getMessage());
            return $this->error('Failed to reject: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get leave details
     * GET /api/leaves/{id}
     */
    public function show($id): JsonResponse
    {
        try {
            $leave = Leave::with([
                'employee:id,first_name,last_name,employee_id,department_id',
                'employee.department:id,name',
                'leaveType:id,name,code,days_per_year',
                'approvals.approver:id,first_name,last_name',
                'cancelledBy:id,first_name,last_name'
            ])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $approvalStatus = $this->approvalService->getApprovalStatus($leave);

            return $this->success([
                'leave' => $leave,
                'approval_status' => $approvalStatus,
            ], 'Leave details fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching leave details: ' . $e->getMessage());
            return $this->error('Failed to fetch leave details: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all leaves with filters
     * GET /api/leaves
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Leave::with([
                'employee:id,first_name,last_name,employee_id,department_id',
                'employee.department:id,name',
                'leaveType:id,name,code',
                'approvals.approver:id,first_name,last_name',
            ]);

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
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

            // For regular employees, only show their own leaves
            $user = $request->user();
            if (!$this->isAdminOrHR($user)) {
                $query->where('employee_id', $user->id);
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
     * Cancel leave
     * PUT /api/leaves/{id}/cancel
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $user = $request->user();

            if ($leave->employee_id !== $user->id && !$this->isAdminOrHR($user)) {
                return $this->unauthorized('You cannot cancel this leave');
            }

            if ($leave->status === 'approved') {
                return $this->error('Approved leave cannot be cancelled', 422);
            }

            if ($leave->status === 'rejected') {
                return $this->error('Rejected leave cannot be cancelled', 422);
            }

            DB::beginTransaction();

            $leave->update([
                'status' => 'cancelled',
                'cancelled_by' => $user->id,
                'cancelled_at' => now(),
            ]);

            // Return days to balance
            $this->balanceService->updateBalanceAfterLeave(
                $leave->employee,
                $leave->leaveType,
                date('Y', strtotime($leave->start_date)),
                'cancel',
                $leave->total_days
            );

            DB::commit();

            return $this->success(null, 'Leave cancelled successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error cancelling leave: ' . $e->getMessage());
            return $this->error('Failed to cancel: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Download attachment
     * GET /api/leaves/{id}/download-attachment
     */
    public function downloadAttachment($id): JsonResponse
    {
        try {
            $leave = Leave::find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            if (!$leave->attachment) {
                return $this->notFound('Attachment not found');
            }

            $path = storage_path('app/public/' . $leave->attachment);

            if (!file_exists($path)) {
                return $this->notFound('File not found');
            }

            return response()->download($path, basename($leave->attachment));
        } catch (\Exception $e) {
            Log::error('Error downloading attachment: ' . $e->getMessage());
            return $this->error('Failed to download attachment: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get public holidays
     * GET /api/public-holidays
     */
    public function publicHolidays(Request $request): JsonResponse
    {
        try {
            $year = $request->year ?? date('Y');

            $holidays = [
                ['date' => $year . '-01-01', 'name' => 'New Year\'s Day', 'type' => 'national'],
                ['date' => $year . '-05-01', 'name' => 'Labor Day', 'type' => 'national'],
                ['date' => $year . '-08-17', 'name' => 'Independence Day', 'type' => 'national'],
                ['date' => $year . '-12-25', 'name' => 'Christmas Day', 'type' => 'national'],
            ];

            return $this->success($holidays, 'Public holidays fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching public holidays: ' . $e->getMessage());
            return $this->error('Failed to fetch public holidays: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Calculate working days between two dates (exclude weekends)
     */
    private function calculateWorkingDays($startDate, $endDate): float
    {
        $days = 0;
        $current = $startDate->copy();

        while ($current <= $endDate) {
            if (!$current->isWeekend()) {
                $days++;
            }
            $current->addDay();
        }

        return max(1, $days);
    }

    /**
     * Check if user is Admin or HR
     */
    private function isAdminOrHR($user): bool
    {
        if (!$user) return false;

        $adminPositions = ['HR Manager', 'HR Officer', 'HR Assistant', 'Admin', 'System Admin'];
        return in_array($user->position->title ?? '', $adminPositions);
    }

    /**
     * Check if user is manager of the employee
     */
    private function isManagerOf($manager, $employee): bool
    {
        return $manager && $employee && $manager->id === $employee->manager_id;
    }
}
