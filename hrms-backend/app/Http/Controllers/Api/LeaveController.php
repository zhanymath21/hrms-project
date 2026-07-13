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

    public function leaveTypes(): JsonResponse
    {
        try {
            $types = LeaveType::where('is_active', true)->get();
            return $this->success($types, 'Leave types fetched');
        } catch (\Exception $e) {
            return $this->error('Failed to fetch leave types: ' . $e->getMessage(), 500);
        }
    }

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

            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);
            $totalDays = $this->calculateWorkingDays($startDate, $endDate);

            $balance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $request->leave_type_id,
                'year' => date('Y'),
            ])->first();

            if (!$balance || $balance->remaining_days < $totalDays) {
                return $this->error(
                    "Insufficient balance! Need {$totalDays} days, available: " . ($balance->remaining_days ?? 0),
                    422
                );
            }

            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $this->approvalService->uploadAttachment($request->file('attachment'));
            }

            $data = $request->all();
            $data['total_days'] = $totalDays;
            $data['attachment'] = $attachmentPath;

            $leave = $this->approvalService->createLeave($employee, $data);

            $this->balanceService->updateBalanceAfterLeave(
                $employee,
                LeaveType::find($request->leave_type_id),
                date('Y'),
                'pending',
                $totalDays
            );

            return $this->success($leave->load(['leaveType', 'approvals.approver']), 'Leave request submitted!', 201);
        } catch (\Exception $e) {
            Log::error('❌ Error creating leave: ' . $e->getMessage());
            return $this->error('Failed to submit leave: ' . $e->getMessage(), 500);
        }
    }

    public function pendingApprovals(Request $request): JsonResponse
    {
        try {
            $employee = $request->user();
            $approvals = $this->approvalService->getPendingApprovals($employee);
            return $this->success($approvals, 'Pending approvals fetched');
        } catch (\Exception $e) {
            return $this->error('Failed to fetch pending approvals: ' . $e->getMessage(), 500);
        }
    }

    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['approvals'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            $employee = $request->user();

            $leave = $this->approvalService->approveLeave($leave, $employee, $request->only(['notes']));

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
            return $this->error('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $leave = Leave::with(['approvals'])->find($id);

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

            $leave = $this->approvalService->rejectLeave($leave, $employee, $request->rejection_reason);

            $this->balanceService->updateBalanceAfterLeave(
                $leave->employee,
                $leave->leaveType,
                date('Y', strtotime($leave->start_date)),
                'reject',
                $leave->total_days
            );

            return $this->success($leave, 'Leave rejected successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to reject: ' . $e->getMessage(), 500);
        }
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = Leave::with(['employee', 'leaveType', 'approvals.approver']);

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

            $perPage = $request->input('per_page', 15);
            $leaves = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return $this->success($leaves, 'Leaves fetched');
        } catch (\Exception $e) {
            return $this->error('Failed to fetch leaves: ' . $e->getMessage(), 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $leave = Leave::with(['employee', 'leaveType', 'approvals.approver'])->find($id);

            if (!$leave) {
                return $this->notFound('Leave not found');
            }

            return $this->success($leave, 'Leave details fetched');
        } catch (\Exception $e) {
            return $this->error('Failed to fetch leave details: ' . $e->getMessage(), 500);
        }
    }

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

            DB::beginTransaction();

            $leave->update([
                'status' => 'cancelled',
                'cancelled_by' => $user->id,
                'cancelled_at' => now(),
            ]);

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
            return $this->error('Failed to cancel: ' . $e->getMessage(), 500);
        }
    }

    public function downloadAttachment($id): JsonResponse
    {
        try {
            $leave = Leave::find($id);

            if (!$leave || !$leave->attachment) {
                return $this->notFound('Attachment not found');
            }

            $path = storage_path('app/public/' . $leave->attachment);

            if (!file_exists($path)) {
                return $this->notFound('File not found');
            }

            return response()->download($path);
        } catch (\Exception $e) {
            return $this->error('Failed to download attachment: ' . $e->getMessage(), 500);
        }
    }

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

    private function isAdminOrHR($user): bool
    {
        if (!$user) return false;

        $adminPositions = ['HR Manager', 'HR Officer', 'HR Assistant', 'Admin', 'System Admin'];
        return in_array($user->position->title ?? '', $adminPositions);
    }
}
