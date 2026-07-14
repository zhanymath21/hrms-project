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
     * Get all active leave types
     */
    public function leaveTypes(): JsonResponse
    {
        try {
            $types = LeaveType::where('is_active', true)->get();
            return $this->success($types, 'Leave types fetched successfully');
        } catch (\Exception $e) {
            Log::error('Error fetching leave types: ' . $e->getMessage());
            return $this->error('Failed to fetch leave types: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Store a new leave request
     */
    public function store(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Creating leave request');
            Log::info('Request data:', $request->all());

            $validator = Validator::make($request->all(), [
                'leave_type_id' => 'required|exists:leave_types,id',
                'start_date' => 'required|date|after_or_equal:today',
                'end_date' => 'required|date|after_or_equal:start_date',
                'reason' => 'required|string|min:5',
                'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:5120',
            ]);

            if ($validator->fails()) {
                Log::error('Validation failed:', $validator->errors()->toArray());
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $employee = $request->user();

            // Check if employee exists
            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found'
                ], 404);
            }

            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);
            $totalDays = $this->calculateWorkingDays($startDate, $endDate);

            Log::info("Total days calculated: {$totalDays}");

            // Check leave balance
            $balance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $request->leave_type_id,
                'year' => date('Y'),
            ])->first();

            if (!$balance) {
                // Ensure balance exists
                $this->balanceService->ensureBalanceExists($employee);
                $balance = LeaveBalance::where([
                    'employee_id' => $employee->id,
                    'leave_type_id' => $request->leave_type_id,
                    'year' => date('Y'),
                ])->first();
            }

            if (!$balance || $balance->remaining_days < $totalDays) {
                $available = $balance ? $balance->remaining_days : 0;
                return response()->json([
                    'status' => 'error',
                    'message' => "Insufficient balance! Need {$totalDays} days, available: {$available} days",
                    'errors' => [
                        'balance' => ["Insufficient balance! Need {$totalDays} days, available: {$available} days"]
                    ]
                ], 422);
            }

            // Handle attachment upload
            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $this->approvalService->uploadAttachment($request->file('attachment'));
            }

            // Prepare data
            $data = $request->all();
            $data['total_days'] = $totalDays;
            $data['attachment'] = $attachmentPath;

            // Create leave
            $leave = $this->approvalService->createLeave($employee, $data);

            // Update balance with pending days
            $this->balanceService->updateBalanceAfterLeave(
                $employee,
                LeaveType::find($request->leave_type_id),
                date('Y'),
                'pending',
                $totalDays
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Leave request submitted successfully!',
                'data' => $leave->load(['leaveType', 'approvals.approver'])
            ], 201);
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
     * Get pending requests for the current user (as approver)
     * FIXED: Renamed from pendingApprovals to pendingRequests
     */
    public function pendingRequests(Request $request): JsonResponse
    {
        try {
            $employee = $request->user();

            if (!$employee) {
                return $this->error('Employee not found', 404);
            }

            $approvals = $this->approvalService->getPendingApprovals($employee);

            return $this->success($approvals, 'Pending requests fetched successfully');
        } catch (\Exception $e) {
            Log::error('Error fetching pending requests: ' . $e->getMessage());
            return $this->error('Failed to fetch pending requests: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve a leave request
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['approvals'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $employee = $request->user();

            if (!$employee) {
                return $this->error('Employee not found', 404);
            }

            // Process approval
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
     * Reject a leave request
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['approvals'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $employee = $request->user();

            if (!$employee) {
                return $this->error('Employee not found', 404);
            }

            $validator = Validator::make($request->all(), [
                'rejection_reason' => 'required|string|min:5',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            // Process rejection
            $leave = $this->approvalService->rejectLeave($leave, $employee, $request->rejection_reason);

            // Update balance (return pending days)
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
     * Get all leaves with filters
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Leave::with(['employee', 'leaveType', 'approvals.approver']);

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
            Log::error('Error fetching leaves: ' . $e->getMessage());
            return $this->error('Failed to fetch leaves: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get a specific leave detail
     */
    public function show($id): JsonResponse
    {
        try {
            $leave = Leave::with([
                'employee',
                'leaveType',
                'approvals.approver',
                'employee.department',
                'employee.position'
            ])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            return $this->success($leave, 'Leave details fetched successfully');
        } catch (\Exception $e) {
            Log::error('Error fetching leave details: ' . $e->getMessage());
            return $this->error('Failed to fetch leave details: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel a leave request
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $user = $request->user();

            if (!$user) {
                return $this->error('User not found', 404);
            }

            // Check if user can cancel
            if ($leave->employee_id !== $user->id && !$this->isAdminOrHR($user)) {
                return $this->unauthorized('You cannot cancel this leave');
            }

            // Check if leave can be cancelled
            if ($leave->status === 'approved') {
                return $this->error('Approved leave cannot be cancelled', 422);
            }

            if ($leave->status === 'cancelled') {
                return $this->error('Leave is already cancelled', 422);
            }

            DB::beginTransaction();

            try {
                // Update leave status
                $leave->update([
                    'status' => 'cancelled',
                    'cancelled_by' => $user->id,
                    'cancelled_at' => now(),
                ]);

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
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Error cancelling leave: ' . $e->getMessage());
            return $this->error('Failed to cancel: ' . $e->getMessage(), 500);
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

            $path = storage_path('app/public/' . $leave->attachment);

            if (!file_exists($path)) {
                return $this->notFound('File not found');
            }

            return response()->download($path);
        } catch (\Exception $e) {
            Log::error('Error downloading attachment: ' . $e->getMessage());
            return $this->error('Failed to download attachment: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get leave statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $employeeId = $request->input('employee_id');

            $query = Leave::query();

            if ($employeeId) {
                $query->where('employee_id', $employeeId);
            }

            $stats = [
                'total_requests' => $query->count(),
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
            Log::error('Error fetching statistics: ' . $e->getMessage());
            return $this->error('Failed to fetch statistics: ' . $e->getMessage(), 500);
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

        $adminPositions = [
            'HR Manager',
            'HR Officer',
            'HR Assistant',
            'Admin',
            'System Admin',
            'Director',
            'CEO'
        ];

        // Check if user has position relationship
        if ($user->relationLoaded('position') && $user->position) {
            return in_array($user->position->title ?? '', $adminPositions);
        }

        // Fallback: check if user has role or permissions
        return $user->hasRole(['admin', 'hr-manager', 'hr-officer']) ?? false;
    }

    /**
     * Get leave requests for a specific employee
     */
    public function employeeLeaves(Request $request, $employeeId): JsonResponse
    {
        try {
            $employee = Employee::find($employeeId);

            if (!$employee) {
                return $this->notFound('Employee not found');
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

            return $this->success([
                'employee' => $employee,
                'leaves' => $leaves,
            ], 'Employee leaves fetched successfully');
        } catch (\Exception $e) {
            Log::error('Error fetching employee leaves: ' . $e->getMessage());
            return $this->error('Failed to fetch employee leaves: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get leave history for the current user
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
            Log::error('Error fetching leave history: ' . $e->getMessage());
            return $this->error('Failed to fetch leave history: ' . $e->getMessage(), 500);
        }
    }
}
