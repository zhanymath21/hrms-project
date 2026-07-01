<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\CacheService;

class PositionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $departmentId = $request->department_id ?? 'all';
        $cacheKey = 'positions_' . $departmentId;

        $data = CacheService::remember($cacheKey, function () use ($request) {
            $query = Position::with('department')->orderBy('title');

            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            return $query->get();
        }, 5);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $position = Position::with('department')->find($id);

        if (!$position) {
            return response()->json([
                'status' => 'error',
                'message' => 'Position not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $position,
        ]);
    }

    // ✅ TAMBAHKAN METHOD INI
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|min:2|max:255',
            'code' => 'nullable|string|max:10',
            'department_id' => 'required|exists:departments,id',
            'description' => 'nullable|string',
        ]);

        $position = Position::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Position created',
            'data' => $position,
        ], 201);
    }

    // ✅ TAMBAHKAN METHOD INI
    public function update(Request $request, int $id): JsonResponse
    {
        $position = Position::find($id);

        if (!$position) {
            return response()->json([
                'status' => 'error',
                'message' => 'Position not found',
            ], 404);
        }

        $validated = $request->validate([
            'title' => 'required|string|min:2|max:255',
            'code' => 'nullable|string|max:10',
            'department_id' => 'required|exists:departments,id',
            'description' => 'nullable|string',
        ]);

        $position->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Position updated',
            'data' => $position,
        ]);
    }

    // ✅ TAMBAHKAN METHOD INI
    public function destroy(int $id): JsonResponse
    {
        $position = Position::find($id);

        if (!$position) {
            return response()->json([
                'status' => 'error',
                'message' => 'Position not found',
            ], 404);
        }

        $position->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Position deleted',
        ]);
    }
}
