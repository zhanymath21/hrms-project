<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Onboarding;
use App\Models\OnboardingStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class OnboardingController extends Controller
{
    // ============ LIST ALL ONBOARDINGS ============
    public function index(Request $request)
    {
        try {
            $query = Onboarding::with(['candidate', 'employee', 'vacancy']);

            // Filters
            if ($request->has('status')) {
                $query->byStatus($request->status);
            }
            if ($request->has('candidate_id')) {
                $query->byCandidate($request->candidate_id);
            }
            if ($request->has('employee_id')) {
                $query->byEmployee($request->employee_id);
            }
            if ($request->has('date_from')) {
                $query->whereDate('start_date', '>=', $request->date_from);
            }
            if ($request->has('date_to')) {
                $query->whereDate('start_date', '<=', $request->date_to);
            }

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->whereHas('candidate', function ($q) use ($search) {
                        $q->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })->orWhere('position_title', 'like', "%{$search}%");
                });
            }

            $onboardings = $query->orderBy('start_date', 'desc')->paginate($request->per_page ?? 15);

            return response()->json([
                'status' => 'success',
                'data' => $onboardings,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching onboardings: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch onboardings: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ GET SINGLE ONBOARDING ============
    public function show($id)
    {
        try {
            $onboarding = Onboarding::with([
                'candidate',
                'employee',
                'vacancy',
                'statusHistories.updatedBy',
                'createdBy',
                'updatedBy'
            ])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $onboarding,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching onboarding: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Onboarding record not found',
            ], 404);
        }
    }

    // ============ CREATE ONBOARDING ============
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'candidate_id' => 'required|exists:candidates,id',
                'vacancy_id' => 'nullable|exists:vacancies,id',
                'position_title' => 'required|string|max:255',
                'start_date' => 'required|date',
                'expected_end_date' => 'nullable|date|after:start_date',
                'status' => 'sometimes|in:pending,in_progress,completed,cancelled,on_hold',
                'notes' => 'nullable|string',
                'tasks' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $onboarding = Onboarding::create([
                'candidate_id' => $request->candidate_id,
                'vacancy_id' => $request->vacancy_id,
                'position_title' => $request->position_title,
                'start_date' => $request->start_date,
                'expected_end_date' => $request->expected_end_date,
                'status' => $request->status ?? 'pending',
                'progress' => 0,
                'notes' => $request->notes,
                'tasks' => $request->tasks ?? [],
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Onboarding created successfully',
                'data' => $onboarding->load(['candidate', 'employee', 'vacancy']),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating onboarding: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create onboarding: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ UPDATE ONBOARDING ============
    public function update(Request $request, $id)
    {
        try {
            $onboarding = Onboarding::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'candidate_id' => 'sometimes|exists:candidates,id',
                'employee_id' => 'nullable|exists:employees,id',
                'vacancy_id' => 'nullable|exists:vacancies,id',
                'position_title' => 'sometimes|string|max:255',
                'start_date' => 'sometimes|date',
                'expected_end_date' => 'nullable|date|after:start_date',
                'actual_end_date' => 'nullable|date',
                'status' => 'sometimes|in:pending,in_progress,completed,cancelled,on_hold',
                'progress' => 'sometimes|integer|min:0|max:100',
                'notes' => 'nullable|string',
                'tasks' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $onboarding->updated_by = auth()->id();
            $onboarding->update($request->all());

            // Update progress based on tasks if tasks were updated
            if ($request->has('tasks')) {
                $onboarding->updateProgress();
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Onboarding updated successfully',
                'data' => $onboarding->load(['candidate', 'employee', 'vacancy']),
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating onboarding: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update onboarding: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ UPDATE STATUS ONLY ============
    public function updateStatus(Request $request, $id)
    {
        try {
            $onboarding = Onboarding::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:pending,in_progress,completed,cancelled,on_hold',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $oldStatus = $onboarding->status;
            $oldProgress = $onboarding->progress;
            $newStatus = $request->status;

            $onboarding->status = $newStatus;

            if ($request->has('notes')) {
                $onboarding->notes = $request->notes;
            }

            // If completed, set end date and progress to 100
            if ($newStatus === 'completed') {
                $onboarding->actual_end_date = now();
                $onboarding->progress = 100;
            }

            // If cancelled, set end date
            if ($newStatus === 'cancelled') {
                $onboarding->actual_end_date = now();
            }

            // If in_progress and progress is 0, set to 10
            if ($newStatus === 'in_progress' && $onboarding->progress == 0) {
                $onboarding->progress = 10;
            }

            $onboarding->updated_by = auth()->id();
            $onboarding->save();

            // Create history
            $onboarding->createHistoryRecord(
                $oldStatus,
                $newStatus,
                $oldProgress,
                $onboarding->progress,
                $request->notes ?? 'Status updated'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Onboarding status updated successfully',
                'data' => [
                    'onboarding' => $onboarding->load(['candidate', 'employee', 'vacancy']),
                    'status_history' => $onboarding->statusHistoryWithUsers,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating status: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update status: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ UPDATE PROGRESS ============
    public function updateProgress(Request $request, $id)
    {
        try {
            $onboarding = Onboarding::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'progress' => 'required|integer|min:0|max:100',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $oldProgress = $onboarding->progress;
            $oldStatus = $onboarding->status;
            $newProgress = $request->progress;

            $onboarding->progress = $newProgress;

            if ($request->has('notes')) {
                $onboarding->notes = $request->notes;
            }

            // Auto-update status based on progress
            if ($newProgress == 100 && $oldStatus !== 'completed') {
                $onboarding->status = 'completed';
                $onboarding->actual_end_date = now();
            } elseif ($newProgress > 0 && $oldStatus == 'pending') {
                $onboarding->status = 'in_progress';
            } elseif ($newProgress == 0 && $oldStatus == 'in_progress') {
                $onboarding->status = 'pending';
            }

            $onboarding->updated_by = auth()->id();
            $onboarding->save();

            // Create history
            $onboarding->createHistoryRecord(
                $oldStatus,
                $onboarding->status,
                $oldProgress,
                $newProgress,
                $request->notes ?? 'Progress updated'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Progress updated successfully',
                'data' => [
                    'onboarding' => $onboarding->load(['candidate', 'employee', 'vacancy']),
                    'status_history' => $onboarding->statusHistoryWithUsers,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating progress: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update progress: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ UPDATE TASKS ============
    public function updateTasks(Request $request, $id)
    {
        try {
            $onboarding = Onboarding::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'tasks' => 'required|array',
                'tasks.*.title' => 'required|string',
                'tasks.*.completed' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $oldStatus = $onboarding->status;
            $oldProgress = $onboarding->progress;

            $onboarding->tasks = $request->tasks;
            $onboarding->updated_by = auth()->id();
            $onboarding->save();

            // Update progress based on tasks
            $onboarding->updateProgress();

            return response()->json([
                'status' => 'success',
                'message' => 'Tasks updated successfully',
                'data' => $onboarding->load(['candidate', 'employee', 'vacancy']),
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating tasks: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update tasks: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ TOGGLE TASK COMPLETION ============
    public function toggleTask(Request $request, $id, $taskIndex)
    {
        try {
            $onboarding = Onboarding::findOrFail($id);

            // Get current tasks
            $tasks = $onboarding->tasks ?? [];

            // Check if task exists
            if (!isset($tasks[$taskIndex])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Task not found at index ' . $taskIndex,
                ], 404);
            }

            // Toggle task completion
            $oldProgress = $onboarding->progress;
            $oldStatus = $onboarding->status;

            $tasks[$taskIndex]['completed'] = !($tasks[$taskIndex]['completed'] ?? false);

            // Update onboarding
            $onboarding->tasks = $tasks;
            $onboarding->updated_by = auth()->id();

            // Calculate new progress
            $completed = collect($tasks)->where('completed', true)->count();
            $total = count($tasks);
            $newProgress = $total > 0 ? round(($completed / $total) * 100) : 0;
            $onboarding->progress = $newProgress;

            // Auto-update status based on progress
            if ($newProgress == 100 && $oldStatus !== 'completed') {
                $onboarding->status = 'completed';
                $onboarding->actual_end_date = now();
            } elseif ($newProgress > 0 && $oldStatus == 'pending') {
                $onboarding->status = 'in_progress';
            } elseif ($newProgress == 0 && $oldStatus == 'in_progress') {
                $onboarding->status = 'pending';
            }

            $onboarding->save();

            // Create history
            $onboarding->createHistoryRecord(
                $oldStatus,
                $onboarding->status,
                $oldProgress,
                $newProgress,
                'Task toggled: ' . ($tasks[$taskIndex]['completed'] ? 'Completed' : 'Reopened') . ' - ' . $tasks[$taskIndex]['title']
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Task toggled successfully',
                'data' => $onboarding->load(['candidate', 'employee', 'vacancy']),
            ]);
        } catch (\Exception $e) {
            Log::error('Error toggling task: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to toggle task: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ GET STATUS HISTORY ============
    public function getStatusHistory($id)
    {
        try {
            $onboarding = Onboarding::findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $onboarding->statusHistoryWithUsers,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching status history: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch status history: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ DELETE ONBOARDING ============
    public function destroy($id)
    {
        try {
            $onboarding = Onboarding::findOrFail($id);

            // Delete related status histories
            $onboarding->statusHistories()->delete();
            $onboarding->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Onboarding deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting onboarding: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete onboarding: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ GET STATISTICS ============
    public function stats()
    {
        try {
            $stats = [
                'total' => Onboarding::count(),
                'pending' => Onboarding::pending()->count(),
                'in_progress' => Onboarding::inProgress()->count(),
                'completed' => Onboarding::completed()->count(),
                'by_status' => Onboarding::select('status', \DB::raw('count(*) as count'))
                    ->groupBy('status')
                    ->get(),
                'average_progress' => round(Onboarding::avg('progress') ?? 0, 2),
                'total_tasks_completed' => Onboarding::all()->sum('completed_tasks_count'),
                'total_tasks' => Onboarding::all()->sum('total_tasks_count'),
            ];

            return response()->json([
                'status' => 'success',
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching stats: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch stats: ' . $e->getMessage(),
            ], 500);
        }
    }
}
