<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\CacheService;

class PositionController extends Controller
{
    /**
     * Get all positions (with optional department filter)
     */
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

    /**
     * Get single position
     */
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
}