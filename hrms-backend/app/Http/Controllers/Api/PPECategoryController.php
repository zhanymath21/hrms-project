<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PPECategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PPECategoryController extends Controller
{
    /**
     * Get all categories with items count
     */
    public function index(): JsonResponse
    {
        $categories = PPECategory::withCount('items')
            ->orderBy('name')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $categories,
        ]);
    }

    /**
     * Get single category
     */
    public function show($id): JsonResponse
    {
        $category = PPECategory::withCount('items')->find($id);

        if (!$category) {
            return response()->json(['status' => 'error', 'message' => 'Category not found'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $category]);
    }

    /**
     * Create category
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:ppe_categories,name',
            'code' => 'required|string|max:50|unique:ppe_categories,code',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $category = PPECategory::create([
            'name' => $request->name,
            'code' => strtoupper($request->code),
            'description' => $request->description,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Category created successfully',
            'data' => $category,
        ], 201);
    }

    /**
     * Update category
     */
    public function update(Request $request, $id): JsonResponse
    {
        $category = PPECategory::find($id);
        if (!$category) {
            return response()->json(['status' => 'error', 'message' => 'Category not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => "required|string|max:255|unique:ppe_categories,name,{$id}",
            'code' => "required|string|max:50|unique:ppe_categories,code,{$id}",
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $category->update([
            'name' => $request->name,
            'code' => strtoupper($request->code),
            'description' => $request->description,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Category updated successfully',
            'data' => $category->fresh(),
        ]);
    }

    /**
     * Delete category
     */
    public function destroy($id): JsonResponse
    {
        $category = PPECategory::find($id);
        if (!$category) {
            return response()->json(['status' => 'error', 'message' => 'Category not found'], 404);
        }

        // Cek apakah ada items
        if ($category->items()->count() > 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete category with existing PPE items. Remove or reassign items first.',
            ], 400);
        }

        $category->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Category deleted successfully',
        ]);
    }
}
