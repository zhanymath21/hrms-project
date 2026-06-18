<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Onboarding;
use App\Models\Candidate;
use App\Models\Employee;
use App\Models\Department;
use App\Models\Position;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OnboardingController extends Controller
{
    /**
     * Get all onboarding records
     */
    public function index(Request $request)
    {
        $query = Onboarding::with(['candidate', 'employee', 'department', 'position']);

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by employee
        if ($request->has('employee_id') && $request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by candidate
        if ($request->has('candidate_id') && $request->candidate_id) {
            $query->where('candidate_id', $request->candidate_id);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('position_title', 'LIKE', "%{$search}%")
                    ->orWhere('notes', 'LIKE', "%{$search}%");
            });
        }

        $perPage = $request->per_page ?? 15;
        $onboarding = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $onboarding
        ]);
    }

    /**
     * Get single onboarding record
     */
    public function show($id)
    {
        $onboarding = Onboarding::with(['candidate', 'employee', 'department', 'position'])->find($id);

        if (!$onboarding) {
            return response()->json([
                'status' => 'error',
                'message' => 'Onboarding record not found'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $onboarding
        ]);
    }

    /**
     * Create new onboarding record
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'candidate_id' => 'nullable|exists:candidates,id',
            'employee_id' => 'nullable|exists:employees,id',
            'department_id' => 'nullable|exists:departments,id',
            'position_id' => 'nullable|exists:positions,id',
            'position_title' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'notes' => 'nullable|string',
            'tasks' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        // If candidate_id is provided, get candidate info
        if ($request->candidate_id) {
            $candidate = Candidate::find($request->candidate_id);
            if ($candidate) {
                $request->merge([
                    'position_title' => $request->position_title ?? $candidate->position_applied,
                    'employee_id' => $request->employee_id ?? null,
                ]);
            }
        }

        $onboarding = Onboarding::create([
            'candidate_id' => $request->candidate_id,
            'employee_id' => $request->employee_id,
            'department_id' => $request->department_id,
            'position_id' => $request->position_id,
            'position_title' => $request->position_title,
            'start_date' => $request->start_date,
            'status' => 'pending',
            'progress' => 0,
            'notes' => $request->notes,
            'tasks' => $request->tasks ?? [],
        ]);

        // Update candidate status
        if ($request->candidate_id) {
            Candidate::where('id', $request->candidate_id)->update(['status' => 'hired']);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Onboarding record created successfully',
            'data' => $onboarding
        ], 201);
    }

    /**
     * Update onboarding record
     */
    public function update(Request $request, $id)
    {
        $onboarding = Onboarding::find($id);

        if (!$onboarding) {
            return response()->json([
                'status' => 'error',
                'message' => 'Onboarding record not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'department_id' => 'nullable|exists:departments,id',
            'position_id' => 'nullable|exists:positions,id',
            'position_title' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'tasks' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $onboarding->update($request->only([
            'department_id',
            'position_id',
            'position_title',
            'start_date',
            'notes',
            'tasks'
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Onboarding record updated successfully',
            'data' => $onboarding
        ]);
    }

    /**
     * Update onboarding progress
     */
    public function updateProgress(Request $request, $id)
    {
        $onboarding = Onboarding::find($id);

        if (!$onboarding) {
            return response()->json([
                'status' => 'error',
                'message' => 'Onboarding record not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'progress' => 'required|integer|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $progress = $request->progress;
        $status = $progress >= 100 ? 'completed' : 'in_progress';

        $onboarding->update([
            'progress' => $progress,
            'status' => $status,
            'notes' => $request->notes ?? $onboarding->notes,
        ]);

        // If completed, create employee record if not exists
        if ($status === 'completed' && !$onboarding->employee_id && $onboarding->candidate_id) {
            $candidate = Candidate::find($onboarding->candidate_id);
            if ($candidate) {
                // You can create employee here
                // Employee::create([...]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Onboarding progress updated successfully',
            'data' => $onboarding
        ]);
    }

    /**
     * Complete onboarding
     */
    public function complete($id)
    {
        $onboarding = Onboarding::find($id);

        if (!$onboarding) {
            return response()->json([
                'status' => 'error',
                'message' => 'Onboarding record not found'
            ], 404);
        }

        $onboarding->update([
            'progress' => 100,
            'status' => 'completed'
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Onboarding completed successfully',
            'data' => $onboarding
        ]);
    }

    /**
     * Delete onboarding record
     */
    public function destroy($id)
    {
        $onboarding = Onboarding::find($id);

        if (!$onboarding) {
            return response()->json([
                'status' => 'error',
                'message' => 'Onboarding record not found'
            ], 404);
        }

        $onboarding->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Onboarding record deleted successfully'
        ]);
    }

    /**
     * Get onboarding statistics
     */
    public function stats()
    {
        $stats = [
            'total' => Onboarding::count(),
            'pending' => Onboarding::where('status', 'pending')->count(),
            'in_progress' => Onboarding::where('status', 'in_progress')->count(),
            'completed' => Onboarding::where('status', 'completed')->count(),
            'cancelled' => Onboarding::where('status', 'cancelled')->count(),
            'avg_progress' => Onboarding::avg('progress') ?? 0,
        ];

        return response()->json([
            'status' => 'success',
            'data' => $stats
        ]);
    }
}
