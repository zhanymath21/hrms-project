<?php
// app/Http/Controllers/Api/ApprovalFlowController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Services\Leave\LeaveApprovalService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ApprovalFlowController extends Controller
{
    use ApiResponseTrait;

    protected LeaveApprovalService $approvalService;

    public function __construct(LeaveApprovalService $approvalService)
    {
        $this->approvalService = $approvalService;
    }

    /**
     * Get approval flow configuration
     * GET /api/approval-flow
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return $this->unauthorized('Only Admin/HR can view approval flow');
            }

            $flows = $this->approvalService->getApprovalFlowConfig();

            return $this->success($flows, 'Approval flow fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching approval flow: ' . $e->getMessage());
            return $this->error('Failed to fetch approval flow: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update approval flow configuration
     * POST /api/approval-flow
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return $this->unauthorized('Only Admin/HR can update approval flow');
            }

            $validator = Validator::make($request->all(), [
                'flows' => 'required|array',
                'flows.*.level' => 'required|integer|min:1',
                'flows.*.approver_type' => 'required|string|in:manager,hr,director,custom',
                'flows.*.approver_id' => 'nullable|exists:employees,id',
                'flows.*.department_id' => 'nullable|exists:departments,id',
                'flows.*.position_id' => 'nullable|exists:positions,id',
                'flows.*.is_active' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $this->approvalService->updateApprovalFlowConfig($request->flows);

            return $this->success(null, 'Approval flow updated successfully');
        } catch (\Exception $e) {
            Log::error('Error updating approval flow: ' . $e->getMessage());
            return $this->error('Failed to update approval flow: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get employee's approval flow
     * GET /api/approval-flow/employee/{employeeId}
     */
    public function getEmployeeFlow($employeeId): JsonResponse
    {
        try {
            $employee = Employee::find($employeeId);

            if (!$employee) {
                return $this->notFound('Employee not found');
            }

            $flows = $this->approvalService->getEmployeeApprovalFlow($employee);

            return $this->success($flows, 'Employee approval flow fetched');
        } catch (\Exception $e) {
            Log::error('Error fetching employee approval flow: ' . $e->getMessage());
            return $this->error('Failed to fetch employee approval flow: ' . $e->getMessage(), 500);
        }
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
}
