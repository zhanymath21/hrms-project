<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Vacancy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ApplicationController extends Controller
{
    /**
     * Get all applications with pagination and filters
     */
    public function index(Request $request)
    {
        $query = Application::with(['candidate', 'vacancy.department']);

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by vacancy
        if ($request->has('vacancy_id') && $request->vacancy_id) {
            $query->where('vacancy_id', $request->vacancy_id);
        }

        // Filter by candidate
        if ($request->has('candidate_id') && $request->candidate_id) {
            $query->where('candidate_id', $request->candidate_id);
        }

        // Search by candidate name or email
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('candidate', function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        $perPage = $request->per_page ?? 15;
        $applications = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $applications
        ]);
    }

    /**
     * Get single application
     */
    public function show($id)
    {
        $application = Application::with(['candidate', 'vacancy.department'])->find($id);

        if (!$application) {
            return response()->json([
                'status' => 'error',
                'message' => 'Application not found'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $application
        ]);
    }

    /**
     * Create new application
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'candidate_id' => 'required|exists:candidates,id',
            'vacancy_id' => 'required|exists:vacancies,id',
            'notes' => 'nullable|string',
            'interview_date' => 'nullable|date|after:now',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if application already exists
        $existing = Application::where('candidate_id', $request->candidate_id)
            ->where('vacancy_id', $request->vacancy_id)
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 'error',
                'message' => 'Application already exists for this candidate and vacancy'
            ], 422);
        }

        $application = Application::create([
            'candidate_id' => $request->candidate_id,
            'vacancy_id' => $request->vacancy_id,
            'notes' => $request->notes,
            'interview_date' => $request->interview_date,
            'status' => 'pending',
        ]);

        // Update candidate status to 'screening' if not set
        $candidate = Candidate::find($request->candidate_id);
        if ($candidate && $candidate->status === 'new') {
            $candidate->update(['status' => 'screening']);
        }

        // Update vacancy applicants count
        $vacancy = Vacancy::find($request->vacancy_id);
        if ($vacancy) {
            $vacancy->increment('applicants_count');
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Application created successfully',
            'data' => $application
        ], 201);
    }

    /**
     * Update application
     */
    public function update(Request $request, $id)
    {
        $application = Application::find($id);

        if (!$application) {
            return response()->json([
                'status' => 'error',
                'message' => 'Application not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'notes' => 'nullable|string',
            'interview_date' => 'nullable|date|after:now',
            'interview_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $application->update($request->only(['notes', 'interview_date', 'interview_notes']));

        return response()->json([
            'status' => 'success',
            'message' => 'Application updated successfully',
            'data' => $application
        ]);
    }

    /**
     * Update application status
     */
    public function updateStatus(Request $request, $id)
    {
        $application = Application::find($id);

        if (!$application) {
            return response()->json([
                'status' => 'error',
                'message' => 'Application not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,reviewed,interview,accepted,rejected',
            'notes' => 'nullable|string',
            'interview_date' => 'nullable|date|after:now',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $oldStatus = $application->status;
        $newStatus = $request->status;

        $application->update([
            'status' => $newStatus,
            'notes' => $request->notes ?? $application->notes,
            'interview_date' => $request->interview_date ?? $application->interview_date,
        ]);

        // Update candidate status based on application status
        $candidate = Candidate::find($application->candidate_id);
        if ($candidate) {
            switch ($newStatus) {
                case 'interview':
                    if ($candidate->status === 'screening' || $candidate->status === 'new') {
                        $candidate->update(['status' => 'interview']);
                    }
                    break;
                case 'accepted':
                    $candidate->update(['status' => 'hired']);
                    break;
                case 'rejected':
                    $candidate->update(['status' => 'rejected']);
                    break;
            }
        }

        // Log status change (optional)
        // You can add activity log here

        return response()->json([
            'status' => 'success',
            'message' => 'Application status updated successfully',
            'data' => $application
        ]);
    }

    /**
     * Delete application
     */
    public function destroy($id)
    {
        $application = Application::find($id);

        if (!$application) {
            return response()->json([
                'status' => 'error',
                'message' => 'Application not found'
            ], 404);
        }

        // Decrement vacancy applicants count
        $vacancy = Vacancy::find($application->vacancy_id);
        if ($vacancy && $vacancy->applicants_count > 0) {
            $vacancy->decrement('applicants_count');
        }

        $application->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Application deleted successfully'
        ]);
    }

    /**
     * Get application statistics
     */
    public function stats()
    {
        $stats = [
            'total' => Application::count(),
            'pending' => Application::where('status', 'pending')->count(),
            'reviewed' => Application::where('status', 'reviewed')->count(),
            'interview' => Application::where('status', 'interview')->count(),
            'accepted' => Application::where('status', 'accepted')->count(),
            'rejected' => Application::where('status', 'rejected')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $stats
        ]);
    }

    /**
     * Get applications by candidate
     */
    public function getByCandidate($candidateId)
    {
        $candidate = Candidate::find($candidateId);

        if (!$candidate) {
            return response()->json([
                'status' => 'error',
                'message' => 'Candidate not found'
            ], 404);
        }

        $applications = Application::where('candidate_id', $candidateId)
            ->with('vacancy')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $applications
        ]);
    }

    /**
     * Get applications by vacancy
     */
    public function getByVacancy($vacancyId)
    {
        $vacancy = Vacancy::find($vacancyId);

        if (!$vacancy) {
            return response()->json([
                'status' => 'error',
                'message' => 'Vacancy not found'
            ], 404);
        }

        $applications = Application::where('vacancy_id', $vacancyId)
            ->with('candidate')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $applications
        ]);
    }

    /**
     * Bulk update application status
     */
    public function bulkUpdateStatus(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array',
            'ids.*' => 'exists:applications,id',
            'status' => 'required|in:pending,reviewed,interview,accepted,rejected',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $count = Application::whereIn('id', $request->ids)
            ->update(['status' => $request->status]);

        return response()->json([
            'status' => 'success',
            'message' => "{$count} applications updated successfully",
            'data' => [
                'updated_count' => $count
            ]
        ]);
    }
}
