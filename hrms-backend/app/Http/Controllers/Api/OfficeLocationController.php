<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OfficeLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OfficeLocationController extends Controller
{
    /**
     * Get all office locations (active only)
     */
    public function index(): JsonResponse
    {
        try {
            $locations = OfficeLocation::where('is_active', true)
                ->orderBy('name')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $locations,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all office locations (including inactive)
     */
    public function all(): JsonResponse
    {
        try {
            $locations = OfficeLocation::orderBy('name')->get();

            return response()->json([
                'status' => 'success',
                'data' => $locations,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single office location
     */
    public function show($id): JsonResponse
    {
        try {
            $location = OfficeLocation::findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $location,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Office location not found',
            ], 404);
        }
    }

    /**
     * Store new office location
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:100',
                'code' => 'required|string|unique:office_locations,code',
                'address' => 'nullable|string|max:255',
                'latitude' => 'required|numeric',
                'longitude' => 'required|numeric',
                'radius_meters' => 'required|integer|min:10|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $location = OfficeLocation::create($request->all());

            return response()->json([
                'status' => 'success',
                'message' => 'Office location created successfully',
                'data' => $location,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update office location
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $location = OfficeLocation::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:100',
                'code' => 'required|string|unique:office_locations,code,' . $id,
                'address' => 'nullable|string|max:255',
                'latitude' => 'required|numeric',
                'longitude' => 'required|numeric',
                'radius_meters' => 'required|integer|min:10|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $location->update($request->all());

            return response()->json([
                'status' => 'success',
                'message' => 'Office location updated successfully',
                'data' => $location,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Toggle active status
     */
    public function toggle($id): JsonResponse
    {
        try {
            $location = OfficeLocation::findOrFail($id);
            $location->update(['is_active' => !$location->is_active]);

            return response()->json([
                'status' => 'success',
                'message' => $location->is_active ? 'Location activated' : 'Location deactivated',
                'data' => $location,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete office location
     */
    public function destroy($id): JsonResponse
    {
        try {
            $location = OfficeLocation::findOrFail($id);
            $location->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Office location deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}