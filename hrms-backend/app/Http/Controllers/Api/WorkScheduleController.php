<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkSchedule;
use App\Models\EmployeeSchedule;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class WorkScheduleController extends Controller
{
    /**
     * Get all work schedules
     */
    public function index(): JsonResponse
    {
        $schedules = WorkSchedule::where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $schedules,
        ]);
    }

    /**
     * Get single work schedule
     */
    public function show($id): JsonResponse
    {
        $schedule = WorkSchedule::find($id);

        if (!$schedule) {
            return response()->json([
                'status' => 'error',
                'message' => 'Schedule not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $schedule,
        ]);
    }

    /**
     * Create new work schedule
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'code' => 'required|string|unique:work_schedules,code|max:50',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'break_start_time' => 'nullable|date_format:H:i',
            'break_end_time' => 'nullable|date_format:H:i',
            'break_duration_minutes' => 'nullable|integer|min:0|max:240',
            'total_working_hours' => 'required|integer|min:1|max:24',
            'is_overnight' => 'boolean',
            'description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $schedule = WorkSchedule::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Work schedule created successfully',
            'data' => $schedule,
        ], 201);
    }

    /**
     * Update work schedule
     */
    public function update(Request $request, $id): JsonResponse
    {
        $schedule = WorkSchedule::find($id);

        if (!$schedule) {
            return response()->json([
                'status' => 'error',
                'message' => 'Schedule not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'code' => "required|string|unique:work_schedules,code,{$id}|max:50",
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'break_start_time' => 'nullable|date_format:H:i',
            'break_end_time' => 'nullable|date_format:H:i',
            'break_duration_minutes' => 'nullable|integer|min:0|max:240',
            'total_working_hours' => 'required|integer|min:1|max:24',
            'is_overnight' => 'boolean',
            'description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $schedule->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Work schedule updated successfully',
            'data' => $schedule,
        ]);
    }

    /**
     * Delete work schedule
     */
    public function destroy($id): JsonResponse
    {
        $schedule = WorkSchedule::find($id);

        if (!$schedule) {
            return response()->json([
                'status' => 'error',
                'message' => 'Schedule not found',
            ], 404);
        }

        // Check if schedule is being used
        $activeAssignments = EmployeeSchedule::where('work_schedule_id', $id)
            ->where('is_active', true)
            ->count();

        if ($activeAssignments > 0) {
            return response()->json([
                'status' => 'error',
                'message' => "Cannot delete schedule. {$activeAssignments} employee(s) are using this schedule.",
            ], 422);
        }

        $schedule->update(['is_active' => false]);
        // $schedule->delete(); // Uncomment for hard delete

        return response()->json([
            'status' => 'success',
            'message' => 'Schedule deleted successfully',
        ]);
    }

    /**
     * Assign schedule to employee
     */
    public function assignToEmployee(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'work_schedule_id' => 'required|exists:work_schedules,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Deactivate all previous active schedules for this employee
        EmployeeSchedule::where('employee_id', $request->employee_id)
            ->where('is_active', true)
            ->update([
                'is_active' => false,
                'end_date' => now()->format('Y-m-d'),
            ]);

        // Create new schedule assignment
        $employeeSchedule = EmployeeSchedule::create([
            'employee_id' => $request->employee_id,
            'work_schedule_id' => $request->work_schedule_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'is_active' => true,
            'notes' => $request->notes,
        ]);

        // Load relationships
        $employeeSchedule->load([
            'employee:id,employee_id,first_name,last_name,department_id',
            'employee.department:id,name',
            'workSchedule',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Schedule assigned successfully',
            'data' => $employeeSchedule,
        ], 201);
    }

    /**
     * Get all employee schedules
     */
    public function getEmployeeSchedules(Request $request): JsonResponse
    {
        $query = EmployeeSchedule::with([
            'employee:id,employee_id,first_name,last_name,email,department_id',
            'employee.department:id,name',
            'workSchedule',
        ])->orderBy('created_at', 'desc');

        // Filter by employee
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter active only
        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        $perPage = $request->input('per_page', 20);
        $schedules = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $schedules,
        ]);
    }

    /**
     * Get current active schedule for employee
     */
    public function getCurrentSchedule(Request $request): JsonResponse
    {
        $employeeId = $request->employee_id ?? $request->user()->id;
        $date = $request->date ?? now()->format('Y-m-d');

        $schedule = EmployeeSchedule::with('workSchedule')
            ->where('employee_id', $employeeId)
            ->where('is_active', true)
            ->where('start_date', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', $date);
            })
            ->orderBy('start_date', 'desc')
            ->first();

        if (!$schedule) {
            return response()->json([
                'status' => 'error',
                'message' => 'No active schedule found. Please contact HR to assign a shift.',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $schedule,
        ]);
    }

    /**
     * Bulk assign schedule to multiple employees
     */
    public function bulkAssign(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'employee_ids' => 'required|array|min:1',
            'employee_ids.*' => 'required|exists:employees,id',
            'work_schedule_id' => 'required|exists:work_schedules,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $assigned = [];
        $errors = [];

        foreach ($request->employee_ids as $employeeId) {
            try {
                // Deactivate old schedules
                EmployeeSchedule::where('employee_id', $employeeId)
                    ->where('is_active', true)
                    ->update(['is_active' => false, 'end_date' => now()->format('Y-m-d')]);

                // Create new assignment
                $assignment = EmployeeSchedule::create([
                    'employee_id' => $employeeId,
                    'work_schedule_id' => $request->work_schedule_id,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'is_active' => true,
                ]);

                $assigned[] = $employeeId;
            } catch (\Exception $e) {
                $errors[] = [
                    'employee_id' => $employeeId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Schedule assigned to " . count($assigned) . " employee(s)",
            'data' => [
                'assigned' => $assigned,
                'errors' => $errors,
            ],
        ]);
    }

    /**
     * Remove employee schedule assignment
     */
    public function removeAssignment($id): JsonResponse
    {
        $assignment = EmployeeSchedule::find($id);

        if (!$assignment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Assignment not found',
            ], 404);
        }

        $assignment->update([
            'is_active' => false,
            'end_date' => now()->format('Y-m-d'),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Schedule assignment removed successfully',
        ]);
    }
}
