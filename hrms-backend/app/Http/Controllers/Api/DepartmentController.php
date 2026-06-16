<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\CacheService;

class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        $data = CacheService::remember('departments_all', function () {
            return Department::orderBy('name')->get();
        }, 5);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $department = Department::with('positions')->find($id);

        if (!$department) {
            return response()->json([
                'status' => 'error',
                'message' => 'Department not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $department,
        ]);
    }

    public function positions(int $id): JsonResponse
    {
        $department = Department::find($id);

        if (!$department) {
            return response()->json([
                'status' => 'error',
                'message' => 'Department not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $department->positions()->orderBy('title')->get(),
        ]);
    }

    // ✅ TAMBAHKAN METHOD INI
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|min:2|max:255',
            'code' => 'required|string|min:2|max:10|unique:departments,code',
            'description' => 'nullable|string',
        ]);

        $department = Department::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Department created',
            'data' => $department,
        ], 201);
    }

    // ✅ TAMBAHKAN METHOD INI
    public function update(Request $request, int $id): JsonResponse
    {
        $department = Department::find($id);

        if (!$department) {
            return response()->json([
                'status' => 'error',
                'message' => 'Department not found',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|min:2|max:255',
            'code' => 'required|string|min:2|max:10|unique:departments,code,' . $id,
            'description' => 'nullable|string',
        ]);

        $department->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Department updated',
            'data' => $department,
        ]);
    }

    // ✅ TAMBAHKAN METHOD INI
    public function destroy(int $id): JsonResponse
    {
        $department = Department::find($id);

        if (!$department) {
            return response()->json([
                'status' => 'error',
                'message' => 'Department not found',
            ], 404);
        }

        $department->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Department deleted',
        ]);
    }
}
