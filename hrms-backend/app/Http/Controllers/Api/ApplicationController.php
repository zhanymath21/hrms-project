<?php

namespace App\Http\Controllers\API;

use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ApplicationController extends Controller
{
    // ============ LIST ALL APPLICATIONS ============
    public function index(Request $request)
    {
        $query = Application::with(['candidate', 'vacancy']);

        // Filters
        if ($request->has('status')) {
            $query->byStatus($request->status);
        }
        if ($request->has('candidate_id')) {
            $query->byCandidate($request->candidate_id);
        }
        if ($request->has('vacancy_id')) {
            $query->byVacancy($request->vacancy_id);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('candidate', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })->orWhereHas('vacancy', function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%");
                });
            });
        }

        $applications = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'status' => 'success',
            'data' => $applications,
        ]);
    }

    // ============ GET STATISTICS ============
    public function stats()
    {
        $stats = [
            'total' => Application::count(),
            'pending' => Application::pending()->count(),
            'accepted' => Application::accepted()->count(),
            'rejected' => Application::rejected()->count(),
            'by_status' => Application::select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->get(),
            'by_candidate' => Application::select('candidate_id', DB::raw('count(*) as count'))
                ->groupBy('candidate_id')
                ->with('candidate')
                ->get()
                ->map(function ($item) {
                    return [
                        'candidate_id' => $item->candidate_id,
                        'candidate_name' => $item->candidate ? $item->candidate->full_name : 'Unknown',
                        'count' => $item->count,
                    ];
                }),
            'by_vacancy' => Application::select('vacancy_id', DB::raw('count(*) as count'))
                ->groupBy('vacancy_id')
                ->with('vacancy')
                ->get()
                ->map(function ($item) {
                    return [
                        'vacancy_id' => $item->vacancy_id,
                        'vacancy_title' => $item->vacancy ? $item->vacancy->title : 'Unknown',
                        'count' => $item->count,
                    ];
                }),
            'recent' => Application::with(['candidate', 'vacancy'])
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $stats,
        ]);
    }

    // ============ CREATE APPLICATION ============
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'candidate_id' => 'required|exists:candidates,id',
            'vacancy_id' => 'required|exists:vacancies,id',
            'status' => 'sometimes|string|in:new,screening,interview,technical_test,hr_interview,offer,hired,rejected,withdrawn,pending,accepted',
            'notes' => 'nullable|string',
            'interview_date' => 'nullable|date',
            'interview_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $application = Application::create([
            'candidate_id' => $request->candidate_id,
            'vacancy_id' => $request->vacancy_id,
            'status' => $request->status ?? 'new',
            'notes' => $request->notes,
            'interview_date' => $request->interview_date,
            'interview_notes' => $request->interview_notes,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Application created successfully',
            'data' => $application->load(['candidate', 'vacancy', 'statusHistories.updatedBy']),
        ], 201);
    }

    // ============ GET SINGLE APPLICATION ============
    public function show($id)
    {
        $application = Application::with([
            'candidate',
            'vacancy.department',
            'statusHistories.updatedBy'
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $application,
        ]);
    }

    // ============ UPDATE APPLICATION ============
    public function update(Request $request, $id)
    {
        $application = Application::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'candidate_id' => 'sometimes|exists:candidates,id',
            'vacancy_id' => 'sometimes|exists:vacancies,id',
            'status' => 'sometimes|string|in:new,screening,interview,technical_test,hr_interview,offer,hired,rejected,withdrawn,pending,accepted',
            'notes' => 'nullable|string',
            'interview_date' => 'nullable|date',
            'interview_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $application->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Application updated successfully',
            'data' => $application->load(['candidate', 'vacancy', 'statusHistories.updatedBy']),
        ]);
    }

    // ============ UPDATE STATUS ONLY ============
    public function updateStatus(Request $request, $id)
    {
        $application = Application::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:new,screening,interview,technical_test,hr_interview,offer,hired,rejected,withdrawn,pending,accepted',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $oldStatus = $application->status;
        $newStatus = $request->status;

        // Update the status
        $application->status = $newStatus;

        if ($request->has('notes')) {
            $application->notes = $request->notes;
        }

        $application->save();

        // Add note to latest history if provided
        if ($request->has('notes') && $request->notes) {
            $latestHistory = ApplicationStatusHistory::where('application_id', $application->id)
                ->where('new_status', $newStatus)
                ->latest()
                ->first();

            if ($latestHistory) {
                $latestHistory->notes = $request->notes;
                $latestHistory->save();
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Application status updated successfully',
            'data' => [
                'application' => $application->load(['candidate', 'vacancy']),
                'status_history' => $application->statusHistoryWithUsers,
            ],
        ]);
    }

    // ============ DELETE APPLICATION ============
    public function destroy($id)
    {
        $application = Application::findOrFail($id);

        // Delete related status histories
        $application->statusHistories()->delete();
        $application->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Application deleted successfully',
        ]);
    }

    // ============ GET BY CANDIDATE ============
    public function getByCandidate($candidateId)
    {
        $applications = Application::with(['candidate', 'vacancy'])
            ->where('candidate_id', $candidateId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $applications,
        ]);
    }

    // ============ GET BY VACANCY ============
    public function getByVacancy($vacancyId)
    {
        $applications = Application::with(['candidate', 'vacancy'])
            ->where('vacancy_id', $vacancyId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $applications,
        ]);
    }

    // ============ BULK UPDATE STATUS ============
    public function bulkUpdateStatus(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'application_ids' => 'required|array',
            'application_ids.*' => 'exists:applications,id',
            'status' => 'required|string|in:new,screening,interview,technical_test,hr_interview,offer,hired,rejected,withdrawn,pending,accepted',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $applicationIds = $request->application_ids;
        $newStatus = $request->status;
        $notes = $request->notes ?? 'Bulk status update';

        // Get all applications
        $applications = Application::whereIn('id', $applicationIds)->get();

        $updatedCount = 0;
        $historyRecords = [];

        foreach ($applications as $application) {
            $oldStatus = $application->status;

            // Update status
            $application->status = $newStatus;
            if ($request->has('notes')) {
                $application->notes = $request->notes;
            }
            $application->save();

            // Create history record
            $history = ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'notes' => $notes,
                'updated_by' => auth()->id() ?? null,
            ]);

            $historyRecords[] = $history;
            $updatedCount++;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Successfully updated {$updatedCount} applications",
            'data' => [
                'updated_count' => $updatedCount,
                'status' => $newStatus,
                'applications' => Application::with(['candidate', 'vacancy'])
                    ->whereIn('id', $applicationIds)
                    ->get(),
                'history' => $historyRecords,
            ],
        ]);
    }

    // ============ GET STATUS HISTORY ============
    public function getStatusHistory($id)
    {
        $application = Application::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $application->statusHistoryWithUsers,
        ]);
    }

    // ============ GET APPLICATION SUMMARY ============
    public function summary()
    {
        $summary = [
            'total_applications' => Application::count(),
            'by_status' => Application::select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->status => $item->count];
                }),
            'today_applications' => Application::whereDate('created_at', today())->count(),
            'this_week_applications' => Application::whereBetween('created_at', [
                now()->startOfWeek(),
                now()->endOfWeek()
            ])->count(),
            'this_month_applications' => Application::whereMonth('created_at', now()->month)->count(),
            'average_per_day' => Application::count() / max(now()->diffInDays(now()->copy()->startOfYear()), 1),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $summary,
        ]);
    }
}
