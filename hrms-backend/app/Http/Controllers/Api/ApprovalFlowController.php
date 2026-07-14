<?php
// app/Http/Controllers/Api/ApprovalFlowController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveApprovalFlow;
use App\Models\Employee;
use App\Models\Department;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ApprovalFlowController extends Controller
{
    /**
     * Get all approval flows
     */
    public function index(Request $request): JsonResponse
    {
        try {
            Log::info('📋 Fetching approval flows');

            $flows = LeaveApprovalFlow::with(['approver', 'department', 'position'])
                ->orderBy('level')
                ->get();

            // Add approver name for display
            $flowsWithNames = $flows->map(function ($flow) {
                $flowData = $flow->toArray();
                $flowData['approver_name'] = $this->getApproverName($flow);
                return $flowData;
            });

            return response()->json([
                'status' => 'success',
                'data' => $flowsWithNames,
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error fetching approval flows: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch approval flows: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update approval flows (bulk update)
     */
    public function update(Request $request): JsonResponse
    {
        try {
            Log::info('📝 Updating approval flows');
            Log::info('Request data:', $request->all());

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
                Log::error('Validation failed:', $validator->errors()->toArray());
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Delete all existing flows
            LeaveApprovalFlow::truncate();

            // Create new flows
            $createdFlows = [];
            foreach ($request->flows as $flowData) {
                $flow = LeaveApprovalFlow::create([
                    'level' => $flowData['level'],
                    'approver_type' => $flowData['approver_type'],
                    'approver_id' => $flowData['approver_id'] ?? null,
                    'department_id' => $flowData['department_id'] ?? null,
                    'position_id' => $flowData['position_id'] ?? null,
                    'is_active' => $flowData['is_active'] ?? true,
                ]);

                $flowDataWithName = $flow->toArray();
                $flowDataWithName['approver_name'] = $this->getApproverName($flow);
                $createdFlows[] = $flowDataWithName;
            }

            Log::info('✅ Approval flows updated successfully', [
                'count' => count($createdFlows)
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Approval flows updated successfully',
                'data' => $createdFlows,
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error updating approval flows: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update approval flows: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get approval flow for a specific employee
     */
    public function getEmployeeFlow(Request $request, $employeeId): JsonResponse
    {
        try {
            Log::info("📋 Fetching approval flow for employee ID: {$employeeId}");

            $employee = Employee::with(['department', 'position'])->find($employeeId);

            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found'
                ], 404);
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

            // Map approver names
            $flowsWithApprovers = $flows->map(function ($flow) {
                $flowData = $flow->toArray();
                $flowData['approver_name'] = $this->getApproverName($flow);
                return $flowData;
            });

            return response()->json([
                'status' => 'success',
                'data' => [
                    'employee' => [
                        'id' => $employee->id,
                        'employee_id' => $employee->employee_id,
                        'name' => $employee->first_name . ' ' . $employee->last_name,
                        'department' => $employee->department->name ?? 'N/A',
                        'position' => $employee->position->title ?? 'N/A',
                    ],
                    'flows' => $flowsWithApprovers,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Error fetching employee flow: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch employee flow: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get approver name based on type
     */
    private function getApproverName($flow)
    {
        switch ($flow->approver_type) {
            case 'manager':
                return 'Manager';
            case 'hr':
                return 'HR';
            case 'director':
                return 'Director';
            case 'custom':
                if ($flow->approver_id) {
                    $approver = Employee::find($flow->approver_id);
                    return $approver ? $approver->first_name . ' ' . $approver->last_name : 'Unknown';
                }
                return 'Not Set';
            default:
                return 'Unknown';
        }
    }

    /**
     * Get departments list for dropdown
     */
    public function getDepartments(): JsonResponse
    {
        try {
            $departments = Department::where('is_active', true)->get(['id', 'name']);
            return response()->json([
                'status' => 'success',
                'data' => $departments,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch departments'
            ], 500);
        }
    }

    /**
     * Get positions list for dropdown
     */
    public function getPositions(): JsonResponse
    {
        try {
            $positions = Position::where('is_active', true)->get(['id', 'title']);
            return response()->json([
                'status' => 'success',
                'data' => $positions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch positions'
            ], 500);
        }
    }

    /**
     * Get employees list for dropdown (custom approver)
     */
    public function getEmployees(): JsonResponse
    {
        try {
            $employees = Employee::where('status', 'active')
                ->get(['id', 'employee_id', 'first_name', 'last_name']);

            $formattedEmployees = $employees->map(function ($emp) {
                return [
                    'id' => $emp->id,
                    'name' => $emp->first_name . ' ' . $emp->last_name . ' (' . $emp->employee_id . ')',
                ];
            });

            return response()->json([
                'status' => 'success',
                'data' => $formattedEmployees,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch employees'
            ], 500);
        }
    }
}
