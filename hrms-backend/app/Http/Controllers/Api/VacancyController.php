<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vacancy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class VacancyController extends Controller
{
    public function index(Request $request)
    {
        $query = Vacancy::with('department');

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('title', 'LIKE', "%{$search}%")
                ->orWhere('location', 'LIKE', "%{$search}%");
        }

        // Status filter
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Department filter
        if ($request->has('department_id') && $request->department_id) {
            $query->where('department_id', $request->department_id);
        }

        $perPage = $request->per_page ?? 15;
        $vacancies = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $vacancies
        ]);
    }

    public function show($id)
    {
        $vacancy = Vacancy::with(['department', 'applications.candidate'])->find($id);

        if (!$vacancy) {
            return response()->json([
                'status' => 'error',
                'message' => 'Vacancy not found'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $vacancy
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'description' => 'nullable|string',
            'requirements' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'salary_min' => 'nullable|numeric|min:0',
            'salary_max' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:open,closed,on_hold',
            'closing_date' => 'nullable|date|after:today',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $vacancy = Vacancy::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Vacancy created successfully',
            'data' => $vacancy
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $vacancy = Vacancy::find($id);

        if (!$vacancy) {
            return response()->json([
                'status' => 'error',
                'message' => 'Vacancy not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'description' => 'nullable|string',
            'requirements' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'salary_min' => 'nullable|numeric|min:0',
            'salary_max' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:open,closed,on_hold',
            'closing_date' => 'nullable|date|after:today',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $vacancy->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Vacancy updated successfully',
            'data' => $vacancy
        ]);
    }

    public function destroy($id)
    {
        $vacancy = Vacancy::find($id);

        if (!$vacancy) {
            return response()->json([
                'status' => 'error',
                'message' => 'Vacancy not found'
            ], 404);
        }

        $vacancy->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Vacancy deleted successfully'
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $vacancy = Vacancy::find($id);

        if (!$vacancy) {
            return response()->json([
                'status' => 'error',
                'message' => 'Vacancy not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:open,closed,on_hold'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $vacancy->update(['status' => $request->status]);

        return response()->json([
            'status' => 'success',
            'message' => 'Vacancy status updated successfully',
            'data' => $vacancy
        ]);
    }

    public function stats()
    {
        $stats = [
            'total' => Vacancy::count(),
            'open' => Vacancy::where('status', 'open')->count(),
            'closed' => Vacancy::where('status', 'closed')->count(),
            'on_hold' => Vacancy::where('status', 'on_hold')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $stats
        ]);
    }
}
