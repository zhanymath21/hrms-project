<?php
// app/Http/Controllers/Api/ReplacementLeaveController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReplacementLeave;
use App\Models\ReplacementLeaveApproval;
use App\Models\LeaveBalance;
use App\Services\Leave\LeaveBalanceService;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ReplacementLeaveController extends Controller
{
    use ApiResponseTrait;

    protected LeaveBalanceService $balanceService;

    public function __construct(LeaveBalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    /**
     * Get all replacement leaves
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = ReplacementLeave::with(['employee', 'approvals.approver']);

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            $perPage = $request->input('per_page', 15);
            $leaves = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return $this->success($leaves, 'Replacement leaves fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching replacement leaves: ' . $e->getMessage());
            return $this->error('Failed to fetch replacement leaves: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create replacement leave request
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'work_date' => 'required|date',
                'work_day_type' => 'required|in:weekend,public_holiday',
                'hours_worked' => 'required|integer|min:1|max:24',
                'replacement_date' => 'required|date|after_or_equal:today',
                'days_to_add' => 'required|numeric|min:0.5',
                'reason' => 'nullable|string|max:500',
                'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:5120',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $employee = $request->user();
            $daysToAdd = (float) $request->days_to_add;

            DB::beginTransaction();

            try {
                $replacement = ReplacementLeave::create([
                    'employee_id' => $employee->id,
                    'work_date' => $request->work_date,
                    'work_day_type' => $request->work_day_type,
                    'hours_worked' => $request->hours_worked,
                    'replacement_date' => $request->replacement_date,
                    'days_to_add' => $daysToAdd,
                    'reason' => $request->reason,
                    'attachment' => $request->file('attachment')?->store('replacement-attachments', 'public'),
                    'status' => 'pending',
                ]);

                DB::commit();

                return $this->success(
                    $replacement->load(['employee']),
                    'Replacement leave request submitted successfully!',
                    201
                );
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('❌ Error creating replacement leave: ' . $e->getMessage());
            return $this->error('Failed to submit replacement leave: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve replacement leave
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::with(['employee'])->find($id);

            if (!$replacement) {
                return $this->notFound('Replacement leave not found');
            }

            if ($replacement->status !== 'pending') {
                return $this->error('This request has already been processed', 422);
            }

            DB::beginTransaction();

            try {
                $replacement->update([
                    'status' => 'approved',
                ]);

                // Add days to leave balance
                $leaveTypes = \App\Models\LeaveType::where('code', 'AL')->first();
                if ($leaveTypes) {
                    $balance = LeaveBalance::where([
                        'employee_id' => $replacement->employee_id,
                        'leave_type_id' => $leaveTypes->id,
                        'year' => date('Y'),
                    ])->first();

                    if ($balance) {
                        $balance->replacement_days += $replacement->days_to_add;
                        $balance->total_entitlement += $replacement->days_to_add;
                        $balance->remaining_days += $replacement->days_to_add;
                        $balance->save();
                    }
                }

                DB::commit();

                return $this->success($replacement, 'Replacement leave approved successfully');
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('❌ Error approving replacement leave: ' . $e->getMessage());
            return $this->error('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject replacement leave
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'rejection_reason' => 'required|string|min:5',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $replacement = ReplacementLeave::find($id);

            if (!$replacement) {
                return $this->notFound('Replacement leave not found');
            }

            if ($replacement->status !== 'pending') {
                return $this->error('This request has already been processed', 422);
            }

            $replacement->update([
                'status' => 'rejected',
                'rejection_reason' => $request->rejection_reason,
            ]);

            return $this->success($replacement, 'Replacement leave rejected successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error rejecting replacement leave: ' . $e->getMessage());
            return $this->error('Failed to reject: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel replacement leave
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::find($id);

            if (!$replacement) {
                return $this->notFound('Replacement leave not found');
            }

            $user = $request->user();

            if ($replacement->employee_id !== $user->id) {
                return $this->unauthorized('You cannot cancel this request');
            }

            if ($replacement->status === 'approved') {
                return $this->error('Approved replacement leave cannot be cancelled', 422);
            }

            $replacement->update([
                'status' => 'cancelled',
                'cancelled_by' => $user->id,
                'cancelled_at' => now(),
            ]);

            return $this->success(null, 'Replacement leave cancelled successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error cancelling replacement leave: ' . $e->getMessage());
            return $this->error('Failed to cancel: ' . $e->getMessage(), 500);
        }
    }
}