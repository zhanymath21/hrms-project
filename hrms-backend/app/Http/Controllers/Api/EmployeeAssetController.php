<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class EmployeeAssetController extends Controller
{
    /**
     * Get all assets
     */
    public function index(Request $request): JsonResponse
    {
        $query = EmployeeAsset::with(['employee:id,employee_id,first_name,last_name,department_id', 'employee.department:id,name']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->asset_type) {
            $query->where('asset_type', $request->asset_type);
        }

        $assets = $query->orderBy('created_at', 'desc')->get()->map(function ($asset) {
            return [
                'id' => $asset->id,
                'employee_id' => $asset->employee_id,
                'employee_name' => $asset->employee->first_name . ' ' . $asset->employee->last_name,
                'employee_nik' => $asset->employee->employee_id,
                'department_name' => $asset->employee->department->name ?? '-',
                'asset_type' => $asset->asset_type,
                'asset_name' => $asset->asset_name,
                'serial_number' => $asset->serial_number,
                'condition' => $asset->condition,
                'status' => $asset->status,
                'notes' => $asset->notes,
                'assigned_date' => $asset->assigned_date?->format('Y-m-d'),
                'return_date' => $asset->return_date?->format('Y-m-d'),
                'return_reason' => $asset->return_reason,
                'return_condition' => $asset->return_condition,
                'return_notes' => $asset->return_notes,
                'replace_reason' => $asset->replace_reason,
                'created_at' => $asset->created_at->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $assets,
        ]);
    }

    /**
     * Get single asset
     */
    public function show($id): JsonResponse
    {
        $asset = EmployeeAsset::with(['employee', 'replacementAsset', 'originalAsset'])->find($id);

        if (!$asset) {
            return response()->json(['status' => 'error', 'message' => 'Asset not found'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $asset]);
    }

    /**
     * Assign asset to employee
     */
    public function assign(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'asset_type' => 'required|string|max:100',
            'asset_name' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:100',
            'condition' => 'required|in:good,fair,poor',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $asset = EmployeeAsset::create([
            'employee_id' => $request->employee_id,
            'asset_type' => $request->asset_type,
            'asset_name' => $request->asset_name,
            'serial_number' => $request->serial_number,
            'condition' => $request->condition,
            'notes' => $request->notes,
            'status' => 'active',
            'assigned_date' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Asset assigned successfully',
            'data' => $asset,
        ], 201);
    }

    /**
     * Return asset (for resign or return)
     */
    public function return(Request $request, $id): JsonResponse
    {
        $asset = EmployeeAsset::find($id);

        if (!$asset) {
            return response()->json(['status' => 'error', 'message' => 'Asset not found'], 404);
        }

        if ($asset->status === 'returned') {
            return response()->json(['status' => 'error', 'message' => 'Asset already returned'], 400);
        }

        $validator = Validator::make($request->all(), [
            'return_reason' => 'required|string|max:255',
            'return_condition' => 'required|in:good,fair,poor,broken',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $asset->update([
            'status' => 'returned',
            'return_date' => now(),
            'return_reason' => $request->return_reason,
            'return_condition' => $request->return_condition,
            'return_notes' => $request->notes,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Asset returned successfully',
            'data' => $asset->fresh(),
        ]);
    }

    /**
     * Replace broken asset with new one
     */
    public function replace(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'asset_type' => 'required|string|max:100',
            'asset_name' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:100',
            'condition' => 'required|in:good,fair,poor',
            'notes' => 'nullable|string',
            'old_asset_id' => 'required|exists:employee_assets,id',
            'replace_reason' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            // 1. Return old asset
            $oldAsset = EmployeeAsset::find($request->old_asset_id);
            $oldAsset->update([
                'status' => 'returned',
                'return_date' => now(),
                'return_reason' => 'Replaced: ' . $request->replace_reason,
                'return_condition' => $oldAsset->condition,
                'return_notes' => $request->notes,
            ]);

            // 2. Create new asset
            $newAsset = EmployeeAsset::create([
                'employee_id' => $request->employee_id,
                'asset_type' => $request->asset_type,
                'asset_name' => $request->asset_name,
                'serial_number' => $request->serial_number,
                'condition' => $request->condition,
                'notes' => $request->notes ?? 'Replacement for asset #' . $oldAsset->id,
                'status' => 'active',
                'assigned_date' => now(),
                'replacement_for_asset_id' => $oldAsset->id,
                'replace_reason' => $request->replace_reason,
            ]);

            // 3. Link old asset to new
            $oldAsset->update(['replaced_by_asset_id' => $newAsset->id]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Asset replaced successfully',
                'data' => [
                    'old_asset' => $oldAsset->fresh(),
                    'new_asset' => $newAsset,
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get asset history (for one employee)
     */
    public function history($employeeId): JsonResponse
    {
        $assets = EmployeeAsset::where('employee_id', $employeeId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $assets,
        ]);
    }
}
