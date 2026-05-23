<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\CacheService;

class DepartmentController extends Controller
{
    /**
     * Get all departments
     */
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

    /**
     * Get single department with positions
     */
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

    /**
     * Get positions by department
     */
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
}