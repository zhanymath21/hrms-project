<?php
// app/Http/Controllers/Api/ApprovalFlowController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveApprovalFlow;
use App\Models\Employee;
use App\Models\Department;
use App\Models\Position;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ApprovalFlowController extends Controller
{
    use ApiResponseTrait;

    /**
     * Get all approval flows
     */
    public function index(): JsonResponse
    {
        try {
            $flows = LeaveApprovalFlow::with(['approver', 'department', 'position'])
                ->orderBy('level')
                ->get();

            return $this->success($flows, 'Approval flows fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching approval flows: ' . $e->getMessage());
            return $this->error('Failed to fetch approval flows: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update approval flows (bulk update)
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'flows' => 'required|array|min:1',
                'flows.*.level' => 'required|integer|min:1',
                'flows.*.approver_type' => 'required|string|in:manager,hr,director,custom',
                'flows.*.approver_id' => 'nullable|exists:employees,id',
                'flows.*.department_id' => 'nullable|exists:departments,id',
                'flows.*.position_id' => 'nullable|exists:positions,id',
                'flows.*.is_active' => 'boolean',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            // Delete all existing flows
            LeaveApprovalFlow::truncate();

            $flows = [];
            foreach ($request->flows as $flowData) {
                $flow = LeaveApprovalFlow::create([
                    'level' => $flowData['level'],
                    'approver_type' => $flowData['approver_type'],
                    'approver_id' => $flowData['approver_id'] ?? null,
                    'department_id' => $flowData['department_id'] ?? null,
                    'position_id' => $flowData['position_id'] ?? null,
                    'is_active' => $flowData['is_active'] ?? true,
                ]);
                $flows[] = $flow;
            }

            return $this->success($flows, 'Approval flows updated successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error updating approval flows: ' . $e->getMessage());
            return $this->error('Failed to update approval flows: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get approval flow for a specific employee
     */
    public function getEmployeeFlow($employeeId): JsonResponse
    {
        try {
            $employee = Employee::with(['department', 'position'])->find($employeeId);

            if (!$employee) {
                return $this->notFound('Employee not found');
            }

            $flows = LeaveApprovalFlow::where('is_active', true)
                ->where(function ($query) use ($employee) {
                    $query->where('department_id', $employee->department_id)
                        ->orWhereNull('department_id');
                })
                ->where(function ($query) use ($employee) {
                    $query->where('position_id', $employee->position_id)
                        ->orWhereNull('position_id');
                })
                ->orderBy('level')
                ->get();

            return $this->success([
                'employee' => [
                    'id' => $employee->id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department->name ?? 'N/A',
                    'position' => $employee->position->title ?? 'N/A',
                ],
                'flows' => $flows,
            ], 'Employee approval flow fetched successfully');
        } catch (\Exception $e) {
            Log::error('❌ Error fetching employee flow: ' . $e->getMessage());
            return $this->error('Failed to fetch employee flow: ' . $e->getMessage(), 500);
        }
    }
}