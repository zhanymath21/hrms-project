<?php
// app/Http/Controllers/Api/LeaveController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\LeaveBalance;
use App\Models\LeaveApproval;
use App\Models\LeaveAuditLog;
use App\Services\Leave\LeaveApprovalService;
use App\Services\Leave\LeaveBalanceService;
use App\Services\Leave\HierarchicalApprovalService;
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

    public function __construct(
        LeaveApprovalService $approvalService,
        LeaveBalanceService $balanceService,
        HierarchicalApprovalService $hierarchyService
    ) {
        $this->approvalService = $approvalService;
        $this->balanceService = $balanceService;
        $this->hierarchyService = $hierarchyService;
    }

    /**
     * Get all leave types
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
                'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:5120',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $employee = $request->user();

            if (!$employee) {
                return $this->error('Employee not found', 404);
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
                return $this->error(
                    "Insufficient balance! Need {$totalDays} days, available: {$available}",
                    422
                );
            }

            // Get approval flow based on hierarchy
            $approvalFlow = $this->hierarchyService->createApprovalFlow(
                new Leave(),
                $employee
            );

            if (empty($approvalFlow)) {
                return $this->error('No approval flow configured. Please contact HR.', 422);
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
                    'approval_flow' => json_encode($approvalFlow),
                    'approval_level' => 0,
                    'total_approval_levels' => count($approvalFlow),
                ]);

                // Create approval stages
                foreach ($approvalFlow as $stage) {
                    LeaveApproval::create([
                        'leave_id' => $leave->id,
                        'approver_id' => $stage['approver_id'],
                        'level' => $stage['level'],
                        'status' => 'pending',
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

                DB::commit();

                Log::info("✅ Leave request created: {$leave->id}");

                return $this->success(
                    $leave->load(['leaveType', 'approvals.approver']),
                    'Leave request submitted successfully!',
                    201
                );
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('❌ Error creating leave: ' . $e->getMessage());
            return $this->error('Failed to submit leave: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve leave
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['approvals', 'employee'])->find($id);
            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $employee = $request->user();

            // Check if this employee can approve
            if (!$this->hierarchyService->canApprove($employee, $leave->employee)) {
                return $this->error('You are not authorized to approve this request', 403);
            }

            // Check if leave is still pending
            if (!$leave->isPending()) {
                return $this->error('This leave request has already been processed', 422);
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

            return $this->success($leave->load(['approvals.approver']), 'Leave approved successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error approving leave: ' . $e->getMessage());
            return $this->error('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject leave
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['approvals', 'employee'])->find($id);
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

            // Check if this employee can approve
            if (!$this->hierarchyService->canApprove($employee, $leave->employee)) {
                return $this->error('You are not authorized to reject this request', 403);
            }

            // Check if leave is still pending
            if (!$leave->isPending()) {
                return $this->error('This leave request has already been processed', 422);
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

            return $this->success($leave->load(['approvals.approver']), 'Leave rejected successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error rejecting leave: ' . $e->getMessage());
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

            // Check if user can cancel
            if ($leave->employee_id !== $user->id && !$this->isAdminOrHR($user)) {
                return $this->unauthorized('You cannot cancel this leave');
            }

            if ($leave->isApproved()) {
                return $this->error('Approved leave cannot be cancelled', 422);
            }

            if ($leave->isCancelled()) {
                return $this->error('Leave is already cancelled', 422);
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

            DB::commit();

            return $this->success(null, 'Leave cancelled successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Error cancelling leave: ' . $e->getMessage());
            return $this->error('Failed to cancel: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get pending approvals for current user
     */
    public function pendingApprovals(Request $request): JsonResponse
    {
        try {
            $employee = $request->user();

            if (!$employee) {
                return $this->error('Employee not found', 404);
            }

            $approvals = $this->approvalService->getPendingApprovals($employee);

            return $this->success($approvals, 'Pending approvals fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching pending approvals: ' . $e->getMessage());
            return $this->error('Failed to fetch pending approvals: ' . $e->getMessage(), 500);
        }
    }

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
     * Get leave audit logs
     */
    public function auditLogs($id): JsonResponse
    {
        try {
            $leave = Leave::find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            // Check authorization
            $user = request()->user();
            if ($leave->employee_id !== $user->id && !$this->isAdminOrHR($user)) {
                return $this->unauthorized('You cannot view this leave history');
            }

            $logs = LeaveAuditLog::with(['performedBy'])
                ->where('leave_id', $id)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($log) {
                    return $log->toApiArray();
                });

            return $this->success($logs, 'Audit logs fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching audit logs: ' . $e->getMessage());
            return $this->error('Failed to fetch audit logs: ' . $e->getMessage(), 500);
        }
    }

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

        // ✅ FIX: Gunakan position title langsung, tanpa hasRole()
        $adminPositions = [
            'HR Manager',
            'HR Officer',
            'HR Assistant',
            'Admin',
            'System Admin',
            'Director',
            'CEO'
        ];

        // Cek melalui relasi position
        if ($user->relationLoaded('position') && $user->position) {
            return in_array($user->position->title ?? '', $adminPositions);
        }

        // Fallback: cek manual jika position tidak diload
        $position = $user->position()->first();
        if ($position) {
            return in_array($position->title ?? '', $adminPositions);
        }

        return false;
    }
}