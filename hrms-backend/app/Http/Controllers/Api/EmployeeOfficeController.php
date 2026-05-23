<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeOfficeLocation;
use App\Models\OfficeLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmployeeOfficeController extends Controller
{
    /**
     * Get assigned offices for an employee
     */
    public function getEmployeeOffices(Request $request): JsonResponse
    {
        $employeeId = $request->employee_id ?? $request->user()->id;

        $assignedOffices = EmployeeOfficeLocation::with('officeLocation')
            ->where('employee_id', $employeeId)
            ->where('is_active', true)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $assignedOffices,
        ]);
    }

    /**
     * Assign office to employee
     */
    public function assignOffice(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'office_location_id' => 'required|exists:office_locations,id',
            'is_primary' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if already assigned
        $existing = EmployeeOfficeLocation::where('employee_id', $request->employee_id)
            ->where('office_location_id', $request->office_location_id)
            ->first();

        if ($existing) {
            $existing->update([
                'is_active' => true,
                'is_primary' => $request->is_primary ?? $existing->is_primary,
                'end_date' => null,
            ]);

            if ($request->is_primary) {
                // Remove primary from other offices
                EmployeeOfficeLocation::where('employee_id', $request->employee_id)
                    ->where('id', '!=', $existing->id)
                    ->update(['is_primary' => false]);

                // Update employee default office
                Employee::where('id', $request->employee_id)
                    ->update(['default_office_id' => $request->office_location_id]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Office assignment updated',
                'data' => $existing->fresh()->load('officeLocation'),
            ]);
        }

        // Create new assignment
        $assignment = EmployeeOfficeLocation::create([
            'employee_id' => $request->employee_id,
            'office_location_id' => $request->office_location_id,
            'is_primary' => $request->is_primary ?? false,
            'is_active' => true,
            'assigned_date' => now()->format('Y-m-d'),
            'notes' => $request->notes,
        ]);

        if ($request->is_primary) {
            EmployeeOfficeLocation::where('employee_id', $request->employee_id)
                ->where('id', '!=', $assignment->id)
                ->update(['is_primary' => false]);

            Employee::where('id', $request->employee_id)
                ->update(['default_office_id' => $request->office_location_id]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Office assigned to employee',
            'data' => $assignment->fresh()->load('officeLocation'),
        ], 201);
    }

    /**
     * Remove office assignment from employee
     */
    public function removeOffice(Request $request, $id): JsonResponse
    {
        $assignment = EmployeeOfficeLocation::findOrFail($id);

        $assignment->update([
            'is_active' => false,
            'end_date' => now()->format('Y-m-d'),
        ]);

        // If this was primary, clear employee default office
        if ($assignment->is_primary) {
            Employee::where('id', $assignment->employee_id)
                ->where('default_office_id', $assignment->office_location_id)
                ->update(['default_office_id' => null]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Office assignment removed',
        ]);
    }

    /**
     * Get employees assigned to an office
     */
    public function getOfficeEmployees($officeId): JsonResponse
    {
        $assignments = EmployeeOfficeLocation::with('employee.department')
            ->where('office_location_id', $officeId)
            ->where('is_active', true)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $assignments,
        ]);
    }
}
