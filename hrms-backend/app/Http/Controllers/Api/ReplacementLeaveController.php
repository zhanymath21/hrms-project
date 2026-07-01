<?php
// app/Http/Controllers/Api/ReplacementLeaveController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReplacementLeave;
use App\Services\Leave\ReplacementLeaveService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReplacementLeaveController extends Controller
{
    use ApiResponseTrait;

    protected ReplacementLeaveService $replacementService;

    public function __construct(ReplacementLeaveService $replacementService)
    {
        $this->replacementService = $replacementService;
    }

    /**
     * Get replacement leaves list
     */
    public function index(Request $request): JsonResponse
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
            return $this->error('Failed to fetch replacement leaves: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get pending replacement requests
     */
    public function pending(Request $request): JsonResponse
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
            return $this->error('Failed to fetch pending replacements: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Request replacement leave
     */
    public function store(Request $request): JsonResponse
    {
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

        try {
            $employee = $request->user();
            $replacement = $this->replacementService->createRequest($employee, $request->all());

            return $this->success(
                $replacement->load('employee'),
                'Replacement leave request submitted!',
                201
            );
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Approve replacement leave
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::with(['employee'])->findOrFail($id);
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
            return $this->error('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject replacement leave
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::findOrFail($id);
            $this->replacementService->reject($replacement, $request->reason);

            return $this->success(null, 'Replacement leave rejected');
        } catch (\Exception $e) {
            return $this->error('Failed to reject: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel replacement leave
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::with(['employee'])->findOrFail($id);
            $user = $request->user();

            $this->replacementService->cancel($replacement, $user, $request->reason);

            return $this->success(null, 'Replacement request cancelled');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
