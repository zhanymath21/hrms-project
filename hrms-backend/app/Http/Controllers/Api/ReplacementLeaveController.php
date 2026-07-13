<?php
// app/Http/Controllers/Api/ReplacementLeaveController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReplacementLeave;
use App\Services\Leave\ReplacementLeaveService;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ReplacementLeaveController extends Controller
{
    use ApiResponseTrait;

    protected ReplacementLeaveService $replacementService;

    public function __construct(ReplacementLeaveService $replacementService)
    {
        $this->replacementService = $replacementService;
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = ReplacementLeave::with(['employee', 'approvals.approver']);

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

    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'work_date' => 'required|date',
                'work_day_type' => 'required|in:weekend,public_holiday',
                'hours_worked' => 'required|integer|min:1|max:12',
                'replacement_date' => 'required|date|after:today',
                'reason' => 'nullable|string|max:500',
                'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:5120',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $employee = $request->user();

            $data = $request->all();
            if ($request->hasFile('attachment')) {
                $data['attachment'] = $this->replacementService->uploadAttachment($request->file('attachment'));
            }

            $replacement = $this->replacementService->createRequest($employee, $data);

            return $this->success(
                $replacement->load('approvals.approver'),
                'Replacement request submitted!',
                201
            );
        } catch (\Exception $e) {
            Log::error('Error creating replacement: ' . $e->getMessage());
            return $this->error($e->getMessage(), 422);
        }
    }

    public function pendingApprovals(Request $request): JsonResponse
    {
        try {
            $employee = $request->user();
            $approvals = $this->replacementService->getPendingApprovals($employee);

            return $this->success($approvals, 'Pending approvals fetched');
        } catch (\Exception $e) {
            return $this->error('Failed to fetch pending approvals: ' . $e->getMessage(), 500);
        }
    }

    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::with(['approvals'])->find($id);

            if (!$replacement) {
                return $this->notFound('Replacement not found');
            }

            $employee = $request->user();

            $replacement = $this->replacementService->approve($replacement, $employee, $request->only(['notes']));

            return $this->success(
                $replacement,
                "Replacement approved! +{$replacement->days_to_add} day(s) added to Annual Leave."
            );
        } catch (\Exception $e) {
            return $this->error('Failed to approve: ' . $e->getMessage(), 500);
        }
    }

    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::find($id);

            if (!$replacement) {
                return $this->notFound('Replacement not found');
            }

            $validator = Validator::make($request->all(), [
                'rejection_reason' => 'required|string|min:5',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $employee = $request->user();
            $replacement = $this->replacementService->reject($replacement, $employee, $request->rejection_reason);

            return $this->success($replacement, 'Replacement rejected');
        } catch (\Exception $e) {
            return $this->error('Failed to reject: ' . $e->getMessage(), 500);
        }
    }

    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::find($id);

            if (!$replacement) {
                return $this->notFound('Replacement not found');
            }

            $employee = $request->user();
            $this->replacementService->cancel($replacement, $employee, $request->reason);

            return $this->success(null, 'Replacement cancelled');
        } catch (\Exception $e) {
            return $this->error('Failed to cancel: ' . $e->getMessage(), 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::with(['employee', 'approvals.approver'])->find($id);

            if (!$replacement) {
                return $this->notFound('Replacement not found');
            }

            return $this->success($replacement, 'Replacement details fetched');
        } catch (\Exception $e) {
            return $this->error('Failed to fetch replacement details: ' . $e->getMessage(), 500);
        }
    }

    public function downloadAttachment($id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::find($id);

            if (!$replacement || !$replacement->attachment) {
                return $this->notFound('Attachment not found');
            }

            $path = storage_path('app/public/' . $replacement->attachment);

            if (!file_exists($path)) {
                return $this->notFound('File not found');
            }

            return response()->download($path);
        } catch (\Exception $e) {
            return $this->error('Failed to download attachment: ' . $e->getMessage(), 500);
        }
    }
}
