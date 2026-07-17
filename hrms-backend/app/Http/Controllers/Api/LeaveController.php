<?php
// app/Http/Controllers/Api/LeaveController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\LeaveBalance;
use App\Models\LeaveApproval;
use App\Models\LeaveAuditLog;
use App\Models\Employee;
use App\Services\Leave\LeaveApprovalService;
use App\Services\Leave\LeaveBalanceService;
use App\Services\Leave\HierarchicalApprovalService;
use App\Services\NotificationService;
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
    protected HierarchicalApprovalService $hierarchyService;
    protected NotificationService $notificationService;

    public function __construct(
        LeaveApprovalService $approvalService,
        LeaveBalanceService $balanceService,
        HierarchicalApprovalService $hierarchyService,
        NotificationService $notificationService
    ) {
        $this->approvalService = $approvalService;
        $this->balanceService = $balanceService;
        $this->hierarchyService = $hierarchyService;
        $this->notificationService = $notificationService;
    }

    /**
     * ==========================================
     * LEAVE TYPES
     * ==========================================
     */

    /**
     * Get all active leave types
     */
    public function leaveTypes(): JsonResponse
    {
        try {
            $types = LeaveType::where('is_active', true)->get();
            return $this->success($types, 'Leave types fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching leave types: ' . $e->getMessage());
            return $this->error('Failed to fetch leave types: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ==========================================
     * LEAVE REQUESTS - CRUD
     * ==========================================
     */

    /**
     * Get list of leaves with filters
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = Leave::with(['employee', 'leaveType', 'approvals.approver']);

            // Filter by employee (if not admin/HR)
            if (!$this->isAdminOrHR($user)) {
                $query->where('employee_id', $user->id);
            }

            // Apply filters
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            if ($request->filled('leave_type_id')) {
                $query->where('leave_type_id', $request->leave_type_id);
            }

            if ($request->filled('start_date')) {
                $query->whereDate('start_date', '>=', $request->start_date);
            }

            if ($request->filled('end_date')) {
                $query->whereDate('end_date', '<=', $request->end_date);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            }

            $perPage = $request->input('per_page', 15);
            $leaves = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return $this->success($leaves, 'Leaves fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching leaves: ' . $e->getMessage());
            return $this->error('Failed to fetch leaves: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get leave detail
     */
    public function show($id): JsonResponse
    {
        try {
            $leave = Leave::with([
                'employee',
                'leaveType',
                'approvals.approver',
                'auditLogs.performedBy'
            ])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            // Check authorization
            $user = request()->user();
            if ($leave->employee_id !== $user->id && !$this->isAdminOrHR($user)) {
                return $this->unauthorized('You cannot view this leave');
            }

            return $this->success($leave, 'Leave details fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching leave details: ' . $e->getMessage());
            return $this->error('Failed to fetch leave details: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create leave request
     * ✅ Employee can select their own approvers (managers only)
     * ✅ Sends notification to all selected approvers
     */
    public function store(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Creating leave request');
            Log::info('📊 Request data:', $request->all());

            $validator = Validator::make($request->all(), [
                'leave_type_id' => 'required|exists:leave_types,id',
                'start_date' => 'required|date|after_or_equal:today',
                'end_date' => 'required|date|after_or_equal:start_date',
                'reason' => 'required|string|min:5',
                'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:5120',
                'selected_approvers' => 'required|array|min:1',
                'selected_approvers.*' => 'exists:employees,id',
            ]);

            if ($validator->fails()) {
                Log::error('❌ Validation failed:', $validator->errors()->toArray());
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $employee = $request->user();

            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found'
                ], 404);
            }

            // ✅ Check if employee selected themselves as approver
            $selectedApprovers = $request->selected_approvers;
            if (in_array($employee->id, $selectedApprovers)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You cannot select yourself as approver',
                    'errors' => ['selected_approvers' => ['You cannot select yourself as approver']]
                ], 422);
            }

            // ✅ Check if selected approvers are managers
            $invalidApprovers = [];
            foreach ($selectedApprovers as $approverId) {
                $approver = Employee::with('position')->find($approverId);
                if (!$approver) {
                    $invalidApprovers[] = $approverId;
                    continue;
                }

                // Check if approver has subordinates OR is a manager position
                $hasSubordinates = Employee::where('manager_id', $approverId)->exists();
                $isManager = in_array($approver->position->title ?? '', [
                    'Manager',
                    'HR Manager',
                    'IT Manager',
                    'Finance Manager',
                    'Marketing Manager',
                    'GM',
                    'CEO',
                    'Director',
                    'Supervisor'
                ]);

                if (!$hasSubordinates && !$isManager) {
                    $invalidApprovers[] = $approver->first_name . ' ' . $approver->last_name;
                }
            }

            if (!empty($invalidApprovers)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Selected approvers must be managers',
                    'errors' => ['selected_approvers' => [
                        'Selected approvers must be managers. Invalid: ' . implode(', ', $invalidApprovers)
                    ]]
                ], 422);
            }

            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);
            $totalDays = $this->calculateWorkingDays($startDate, $endDate);

            // Check balance
            $balance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $request->leave_type_id,
                'year' => date('Y'),
            ])->first();

            if (!$balance || $balance->remaining_days < $totalDays) {
                $available = $balance ? $balance->remaining_days : 0;
                return response()->json([
                    'status' => 'error',
                    'message' => "Insufficient balance! Need {$totalDays} days, available: {$available}",
                ], 422);
            }

            // Handle attachment
            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $request->file('attachment')->store('leave-attachments', 'public');
            }

            DB::beginTransaction();

            try {
                // Create leave
                $leave = Leave::create([
                    'employee_id' => $employee->id,
                    'leave_type_id' => $request->leave_type_id,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'total_days' => $totalDays,
                    'reason' => $request->reason,
                    'attachment' => $attachmentPath,
                    'status' => 'pending',
                    'selected_approvers' => json_encode($selectedApprovers),
                    'is_employee_selected' => true,
                    'approval_level' => 0,
                    'total_approval_levels' => count($selectedApprovers),
                ]);

                // ✅ Create approval stages for selected approvers
                foreach ($selectedApprovers as $index => $approverId) {
                    LeaveApproval::create([
                        'leave_id' => $leave->id,
                        'approver_id' => $approverId,
                        'level' => $index + 1,
                        'status' => 'pending',
                        'is_selected' => true,
                    ]);
                }

                // Log creation
                LeaveAuditLog::logCreated($leave, $employee->id);

                // Update balance with pending days
                $this->balanceService->updateBalanceAfterLeave(
                    $employee,
                    LeaveType::find($request->leave_type_id),
                    date('Y'),
                    'pending',
                    $totalDays
                );

                // ✅ SEND NOTIFICATIONS TO APPROVERS
                $leaveData = [
                    'id' => $leave->id,
                    'leave_type' => LeaveType::find($request->leave_type_id)->name,
                    'total_days' => $totalDays,
                    'start_date' => $startDate->format('d/m/Y'),
                    'end_date' => $endDate->format('d/m/Y'),
                    'reason' => $request->reason,
                ];

                $this->notificationService->sendLeaveRequest(
                    $employee,
                    $selectedApprovers,
                    $leaveData
                );

                DB::commit();

                Log::info("✅ Leave request created: {$leave->id}");

                return response()->json([
                    'status' => 'success',
                    'message' => 'Leave request submitted successfully!',
                    'data' => $leave->load(['leaveType', 'approvals.approver']),
                ], 201);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('❌ Error creating leave: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to submit leave: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ==========================================
     * LEAVE ACTIONS - APPROVE, REJECT, CANCEL
     * ==========================================
     */

    /**
     * Approve leave
     * ✅ Only selected approvers can approve
     * ✅ Sends notification to employee
     * ✅ Sends notification to next approver if any
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['approvals', 'employee', 'leaveType'])->find($id);
            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $employee = $request->user();

            // ✅ Check if employee is a selected approver
            $isSelectedApprover = LeaveApproval::where('leave_id', $leave->id)
                ->where('approver_id', $employee->id)
                ->where('is_selected', true)
                ->where('status', 'pending')
                ->exists();

            if (!$isSelectedApprover) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You are not authorized to approve this request',
                ], 403);
            }

            // Check if leave is still pending
            if (!$leave->isPending()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This leave request has already been processed',
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'notes' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $leave = $this->approvalService->approveLeave(
                $leave,
                $employee,
                $request->input('notes')
            );

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

            // Log approval
            $currentApproval = $leave->approvals()->where('approver_id', $employee->id)->first();
            LeaveAuditLog::logApproved(
                $leave,
                $employee->id,
                $currentApproval ? $currentApproval->level : null,
                $request->input('notes')
            );

            // ✅ SEND NOTIFICATION TO EMPLOYEE
            $leaveData = [
                'id' => $leave->id,
                'leave_type' => $leave->leaveType->name,
                'total_days' => $leave->total_days,
                'start_date' => $leave->start_date->format('d/m/Y'),
                'end_date' => $leave->end_date->format('d/m/Y'),
            ];

            $this->notificationService->sendLeaveApproved(
                $leave->employee,
                $employee,
                $leaveData
            );

            // ✅ If not fully approved, notify next approver
            if ($leave->status === 'pending') {
                $nextApproval = $leave->approvals()->where('status', 'pending')->first();
                if ($nextApproval) {
                    $this->notificationService->sendLeaveRequest(
                        $leave->employee,
                        [$nextApproval->approver_id],
                        $leaveData
                    );
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Leave approved successfully',
                'data' => $leave->load(['approvals.approver']),
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error approving leave: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to approve: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject leave
     * ✅ Only selected approvers can reject
     * ✅ Sends notification to employee
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['approvals', 'employee', 'leaveType'])->find($id);
            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $employee = $request->user();

            $validator = Validator::make($request->all(), [
                'rejection_reason' => 'required|string|min:5',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            // ✅ Check if employee is a selected approver
            $isSelectedApprover = LeaveApproval::where('leave_id', $leave->id)
                ->where('approver_id', $employee->id)
                ->where('is_selected', true)
                ->where('status', 'pending')
                ->exists();

            if (!$isSelectedApprover) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You are not authorized to reject this request',
                ], 403);
            }

            // Check if leave is still pending
            if (!$leave->isPending()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This leave request has already been processed',
                ], 422);
            }

            $leave = $this->approvalService->rejectLeave(
                $leave,
                $employee,
                $request->rejection_reason
            );

            // Update balance (return pending days)
            $this->balanceService->updateBalanceAfterLeave(
                $leave->employee,
                $leave->leaveType,
                date('Y', strtotime($leave->start_date)),
                'reject',
                $leave->total_days
            );

            // Log rejection
            $currentApproval = $leave->approvals()->where('approver_id', $employee->id)->first();
            LeaveAuditLog::logRejected(
                $leave,
                $employee->id,
                $currentApproval ? $currentApproval->level : null,
                $request->rejection_reason
            );

            // ✅ SEND NOTIFICATION TO EMPLOYEE
            $leaveData = [
                'id' => $leave->id,
                'leave_type' => $leave->leaveType->name,
                'total_days' => $leave->total_days,
                'start_date' => $leave->start_date->format('d/m/Y'),
                'end_date' => $leave->end_date->format('d/m/Y'),
            ];

            $this->notificationService->sendLeaveRejected(
                $leave->employee,
                $employee,
                $leaveData,
                $request->rejection_reason
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Leave rejected successfully',
                'data' => $leave->load(['approvals.approver']),
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error rejecting leave: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to reject: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel leave
     * ✅ Only the requester can cancel
     * ✅ Sends notification to all approvers
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['leaveType'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $user = $request->user();

            // ✅ Only the requester can cancel
            if ($leave->employee_id !== $user->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Only the requester can cancel this leave',
                ], 403);
            }

            if ($leave->isApproved()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Approved leave cannot be cancelled',
                ], 422);
            }

            if ($leave->isCancelled()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Leave is already cancelled',
                ], 422);
            }

            DB::beginTransaction();

            $leave->update([
                'status' => 'cancelled',
                'cancelled_by' => $user->id,
                'cancelled_at' => now(),
            ]);

            // Log cancellation
            LeaveAuditLog::logCancelled($leave, $user->id, $request->input('reason'));

            // Update balance (return pending days)
            $this->balanceService->updateBalanceAfterLeave(
                $leave->employee,
                $leave->leaveType,
                date('Y', strtotime($leave->start_date)),
                'cancel',
                $leave->total_days
            );

            // ✅ SEND NOTIFICATION TO APPROVERS
            $approverIds = LeaveApproval::where('leave_id', $leave->id)
                ->pluck('approver_id')
                ->toArray();

            $leaveData = [
                'id' => $leave->id,
                'leave_type' => $leave->leaveType->name,
                'total_days' => $leave->total_days,
                'start_date' => $leave->start_date->format('d/m/Y'),
                'end_date' => $leave->end_date->format('d/m/Y'),
                'reason' => $request->input('reason'),
            ];

            if (!empty($approverIds)) {
                $this->notificationService->sendLeaveCancelled(
                    $user,
                    $approverIds,
                    $leaveData
                );
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Leave cancelled successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Error cancelling leave: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to cancel: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ==========================================
     * PENDING APPROVALS
     * ==========================================
     */

    /**
     * Get pending requests for current user
     * ✅ Only shows leaves where user is a selected approver
     */
    public function pendingRequests(Request $request): JsonResponse
    {
        return $this->pendingApprovals($request);
    }

    /**
     * Get pending approvals for current user
     * ✅ Only shows leaves where user is a selected approver
     */
    public function pendingApprovals(Request $request): JsonResponse
    {
        try {
            $employee = $request->user();

            if (!$employee) {
                return $this->error('Employee not found', 404);
            }

            // ✅ Get approvals where user is selected approver
            $approvals = LeaveApproval::with(['leave', 'leave.employee', 'leave.leaveType'])
                ->where('approver_id', $employee->id)
                ->where('is_selected', true)
                ->where('status', 'pending')
                ->orderBy('created_at', 'asc')
                ->get();

            // Also include approvals from hierarchical flow if any
            $hierarchicalApprovals = $this->approvalService->getPendingApprovals($employee);

            // Merge and unique
            $allApprovals = $approvals->merge($hierarchicalApprovals)->unique('id')->values();

            return $this->success($allApprovals, 'Pending approvals fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching pending approvals: ' . $e->getMessage());
            return $this->error('Failed to fetch pending approvals: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ==========================================
     * STATISTICS & HISTORY
     * ==========================================
     */

    /**
     * Get leave statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = Leave::query();

            if (!$this->isAdminOrHR($user)) {
                $query->where('employee_id', $user->id);
            }

            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            $stats = [
                'total' => (clone $query)->count(),
                'pending' => (clone $query)->where('status', 'pending')->count(),
                'approved' => (clone $query)->where('status', 'approved')->count(),
                'rejected' => (clone $query)->where('status', 'rejected')->count(),
                'cancelled' => (clone $query)->where('status', 'cancelled')->count(),
                'total_days_used' => (clone $query)->where('status', 'approved')->sum('total_days'),
            ];

            // Monthly statistics
            $monthlyStats = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthQuery = clone $query;
                $monthlyStats[] = [
                    'month' => $i,
                    'month_name' => Carbon::create()->month($i)->format('F'),
                    'total' => (clone $monthQuery)->whereMonth('created_at', $i)->count(),
                    'approved' => (clone $monthQuery)->whereMonth('created_at', $i)
                        ->where('status', 'approved')->count(),
                ];
            }

            return $this->success([
                'summary' => $stats,
                'monthly' => $monthlyStats,
            ], 'Statistics fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching statistics: ' . $e->getMessage());
            return $this->error('Failed to fetch statistics: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get leave history for current user
     */
    public function myHistory(Request $request): JsonResponse
    {
        try {
            $employee = $request->user();

            if (!$employee) {
                return $this->error('Employee not found', 404);
            }

            $query = Leave::with(['leaveType', 'approvals.approver'])
                ->where('employee_id', $employee->id);

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('year')) {
                $query->whereYear('start_date', $request->year);
            }

            $perPage = $request->input('per_page', 15);
            $leaves = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return $this->success($leaves, 'Leave history fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching leave history: ' . $e->getMessage());
            return $this->error('Failed to fetch leave history: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get leaves for a specific employee (Admin/HR only)
     */
    public function employeeLeaves(Request $request, $employeeId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return $this->unauthorized('You are not authorized to view this data');
            }

            $query = Leave::with(['leaveType', 'approvals.approver'])
                ->where('employee_id', $employeeId);

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('year')) {
                $query->whereYear('start_date', $request->year);
            }

            $perPage = $request->input('per_page', 15);
            $leaves = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return $this->success($leaves, 'Employee leaves fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching employee leaves: ' . $e->getMessage());
            return $this->error('Failed to fetch employee leaves: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ==========================================
     * ATTACHMENT
     * ==========================================
     */

    /**
     * Download attachment
     */
    public function downloadAttachment($id): JsonResponse
    {
        try {
            $leave = Leave::find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            if (!$leave->attachment) {
                return $this->notFound('No attachment found');
            }

            // Check authorization
            $user = request()->user();
            if ($leave->employee_id !== $user->id && !$this->isAdminOrHR($user)) {
                return $this->unauthorized('You cannot download this attachment');
            }

            $path = storage_path('app/public/' . $leave->attachment);

            if (!file_exists($path)) {
                return $this->notFound('File not found');
            }

            return response()->download($path);
        } catch (\Exception $e) {
            Log::error('❌ Error downloading attachment: ' . $e->getMessage());
            return $this->error('Failed to download attachment: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ==========================================
     * PUBLIC HOLIDAYS
     * ==========================================
     */

    /**
     * Get public holidays (placeholder)
     */
    public function publicHolidays(Request $request): JsonResponse
    {
        try {
            // This is a placeholder - you can implement actual public holidays
            $holidays = [
                [
                    'name' => 'New Year\'s Day',
                    'date' => date('Y') . '-01-01',
                    'description' => 'New Year\'s Day'
                ],
                [
                    'name' => 'Independence Day',
                    'date' => date('Y') . '-07-04',
                    'description' => 'Independence Day'
                ],
                // Add more holidays as needed
            ];

            return $this->success($holidays, 'Public holidays fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching public holidays: ' . $e->getMessage());
            return $this->error('Failed to fetch public holidays: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ==========================================
     * GET MANAGERS
     * ==========================================
     */

    /**
     * Get all managers (employees who can approve leaves)
     */
    public function getManagers(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Get employees who have subordinates OR have manager position
            $managers = Employee::with(['position', 'department'])
                ->where('status', 'active')
                ->where('id', '!=', $user->id) // Exclude current user
                ->where(function ($query) {
                    $query->whereHas('subordinates')
                        ->orWhereHas('position', function ($q) {
                            $q->whereIn('title', [
                                'Manager',
                                'HR Manager',
                                'IT Manager',
                                'Finance Manager',
                                'Marketing Manager',
                                'GM',
                                'CEO',
                                'Director',
                                'Supervisor'
                            ]);
                        });
                })
                ->get()
                ->map(function ($employee) {
                    return [
                        'id' => $employee->id,
                        'employee_id' => $employee->employee_id,
                        'first_name' => $employee->first_name,
                        'last_name' => $employee->last_name,
                        'email' => $employee->email,
                        'position' => $employee->position ? [
                            'id' => $employee->position->id,
                            'title' => $employee->position->title,
                        ] : null,
                        'department' => $employee->department ? [
                            'id' => $employee->department->id,
                            'name' => $employee->department->name,
                        ] : null,
                    ];
                });

            return $this->success($managers, 'Managers fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching managers: ' . $e->getMessage());
            return $this->error('Failed to fetch managers: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ==========================================
     * HELPER METHODS
     * ==========================================
     */

    /**
     * Calculate working days between two dates (excluding weekends)
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

        $adminPositions = [
            'HR Manager',
            'HR Officer',
            'HR Assistant',
            'Admin',
            'System Admin',
            'Director',
            'CEO'
        ];

        if ($user->relationLoaded('position') && $user->position) {
            return in_array($user->position->title ?? '', $adminPositions);
        }

        try {
            $position = $user->position()->first();
            if ($position) {
                return in_array($position->title ?? '', $adminPositions);
            }
        } catch (\Exception $e) {
            Log::warning('Could not load position for user: ' . $e->getMessage());
        }

        return false;
    }
}