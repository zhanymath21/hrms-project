<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncidentReport;
use App\Models\IncidentStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class IncidentReportController extends Controller
{
    // ============ LIST ALL INCIDENTS ============
    public function index(Request $request)
    {
        try {
            $query = IncidentReport::with(['reportedBy', 'assignedTo', 'createdBy', 'manager1', 'manager2']);

            // Filters
            if ($request->has('status')) {
                $query->byStatus($request->status);
            }
            if ($request->has('category')) {
                $query->byCategory($request->category);
            }
            if ($request->has('severity')) {
                $query->bySeverity($request->severity);
            }
            if ($request->has('approval_status')) {
                $query->byApprovalStatus($request->approval_status);
            }
            if ($request->has('date_from')) {
                $query->whereDate('incident_date', '>=', $request->date_from);
            }
            if ($request->has('date_to')) {
                $query->whereDate('incident_date', '<=', $request->date_to);
            }
            if ($request->has('reported_by')) {
                $query->where('reported_by', $request->reported_by);
            }
            if ($request->has('assigned_to')) {
                $query->where('assigned_to', $request->assigned_to);
            }

            // Search
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            }

            $incidents = $query->orderBy('incident_date', 'desc')->paginate($request->per_page ?? 15);

            return response()->json([
                'status' => 'success',
                'data' => $incidents,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching incidents: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch incidents: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ GET SINGLE INCIDENT ============
    public function show($id)
    {
        try {
            $incident = IncidentReport::with([
                'reportedBy',
                'assignedTo',
                'createdBy',
                'manager1',
                'manager2',
                'manager3',
                'manager4',
                'statusHistories.updatedBy'
            ])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $incident,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching incident: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Incident not found',
            ], 404);
        }
    }

    public function store(Request $request)
    {
        try {
            // Log incoming data for debugging
            Log::info('Incident Report Store Request:', [
                'all' => $request->all(),
                'files' => $request->hasFile('file') ? 'has file' : 'no file',
                'witnesses' => $request->witnesses,
            ]);

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'location' => 'nullable|string|max:255',
                'incident_date' => 'required|date',
                'incident_time' => 'nullable|date_format:H:i',
                'category' => 'required|in:safety,security,health,property_damage,environmental,harassment,discrimination,fraud,theft,data_breach,policy_violation,workplace_violence,accident,near_miss,other',
                'severity' => 'required|in:low,medium,high,critical',
                'assigned_to' => 'nullable|exists:employees,id',
                'witnesses' => 'nullable|json',
                'file' => 'nullable|file|max:10240',
            ]);

            if ($validator->fails()) {
                Log::warning('Incident Report Validation Failed:', [
                    'errors' => $validator->errors(),
                    'input' => $request->all(),
                ]);

                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $data = $request->all();
            $data['reported_by'] = auth()->id();
            $data['created_by'] = auth()->id();
            $data['status'] = 'reported';
            $data['approval_status'] = 'pending';

            // Handle file upload
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $fileName = time() . '_' . $file->getClientOriginalName();
                $filePath = $file->storeAs('incident_reports', $fileName, 'public');
                $data['file_path'] = $filePath;
                $data['file_name'] = $file->getClientOriginalName();
            }

            // Handle witnesses
            if ($request->has('witnesses')) {
                $witnesses = $request->witnesses;
                // If it's a JSON string, use it directly
                if (is_string($witnesses)) {
                    // Validate it's valid JSON
                    $decoded = json_decode($witnesses, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $data['witnesses'] = $witnesses;
                    } else {
                        $data['witnesses'] = json_encode([]);
                    }
                } elseif (is_array($witnesses)) {
                    $data['witnesses'] = json_encode($witnesses);
                } else {
                    $data['witnesses'] = json_encode([]);
                }
            } else {
                $data['witnesses'] = json_encode([]);
            }

            $incident = IncidentReport::create($data);

            Log::info('Incident Report Created:', ['id' => $incident->id]);

            return response()->json([
                'status' => 'success',
                'message' => 'Incident report created successfully',
                'data' => $incident->load(['reportedBy', 'assignedTo']),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating incident: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create incident: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ UPDATE INCIDENT ============
    public function update(Request $request, $id)
    {
        try {
            $incident = IncidentReport::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|string|max:255',
                'description' => 'sometimes|string',
                'location' => 'nullable|string|max:255',
                'incident_date' => 'sometimes|date',
                'incident_time' => 'nullable|date_format:H:i',
                'category' => 'sometimes|in:safety,security,health,property_damage,environmental,harassment,discrimination,fraud,theft,data_breach,policy_violation,workplace_violence,accident,near_miss,other',
                'severity' => 'sometimes|in:low,medium,high,critical',
                'assigned_to' => 'nullable|exists:employees,id',
                'witnesses' => 'nullable|array',
                'witnesses.*.name' => 'required|string',
                'witnesses.*.contact' => 'nullable|string',
                'resolution_notes' => 'nullable|string',
                'resolved_date' => 'nullable|date',
                'file' => 'nullable|file|max:10240',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $data = $request->all();

            // Handle file upload
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $fileName = time() . '_' . $file->getClientOriginalName();
                $filePath = $file->storeAs('incident_reports', $fileName, 'public');
                $data['file_path'] = $filePath;
                $data['file_name'] = $file->getClientOriginalName();
            }

            // Handle file removal
            if ($request->has('remove_file') && $request->remove_file === 'true') {
                $data['file_path'] = null;
                $data['file_name'] = null;
            }

            // Handle witnesses - ensure it's an array
            if ($request->has('witnesses')) {
                $witnesses = $request->witnesses;
                // If it's a string, try to decode it
                if (is_string($witnesses)) {
                    $witnesses = json_decode($witnesses, true);
                }
                // Ensure it's an array
                if (is_array($witnesses)) {
                    $data['witnesses'] = json_encode($witnesses);
                } else {
                    $data['witnesses'] = json_encode([]);
                }
            }

            $incident->update($data);

            return response()->json([
                'status' => 'success',
                'message' => 'Incident updated successfully',
                'data' => $incident->load(['reportedBy', 'assignedTo']),
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating incident: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update incident: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ UPDATE STATUS ============
    public function updateStatus(Request $request, $id)
    {
        try {
            $incident = IncidentReport::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:reported,under_investigation,in_review,resolved,closed,rejected',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $oldStatus = $incident->status;
            $newStatus = $request->status;
            $notes = $request->notes ?? 'Status updated';

            $incident->status = $newStatus;

            if ($newStatus === 'resolved' || $newStatus === 'closed') {
                $incident->resolved_date = now();
            }

            if ($request->has('resolution_notes')) {
                $incident->resolution_notes = $request->resolution_notes;
            }

            $incident->save();

            // Create history
            $incident->createHistoryRecord($oldStatus, $newStatus, null, null, $notes);

            return response()->json([
                'status' => 'success',
                'message' => 'Incident status updated successfully',
                'data' => [
                    'incident' => $incident->load(['reportedBy', 'assignedTo']),
                    'status_history' => $incident->statusHistoryWithUsers,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating incident status: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update status: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ SET APPROVAL FLOW ============
    public function setApprovalFlow(Request $request, $id)
    {
        try {
            $incident = IncidentReport::findOrFail($id);

            // Check if user is authorized (only creator or admin can set approval flow)
            $user = auth()->user();
            $isCreator = $incident->created_by === $user->id;
            $isAdmin = $user->hasRole('admin') || $user->hasRole('hr'); // Adjust roles as needed

            if (!$isCreator && !$isAdmin) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You are not authorized to set approval flow. Only the creator of this incident or admin can set approval flow.',
                ], 403);
            }

            // Check if approval is already completed
            if (in_array($incident->approval_status, ['approved', 'rejected'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot update approval flow. This incident has already been ' . $incident->approval_status,
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'approval_flow' => 'required|array',
                'approval_flow.*' => 'exists:employees,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $flow = $request->approval_flow;

            // Limit to 4 managers
            if (count($flow) > 4) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Maximum 4 managers allowed in approval flow',
                ], 400);
            }

            // Check if the same manager is selected multiple times
            if (count($flow) !== count(array_unique($flow))) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot select the same manager multiple times',
                ], 400);
            }

            $data = [
                'approval_flow' => json_encode($flow),
                'approval_status' => 'pending',
            ];

            // Reset managers
            for ($i = 1; $i <= 4; $i++) {
                $data['manager' . $i . '_id'] = null;
                $data['manager' . $i . '_status'] = 'pending';
                $data['manager' . $i . '_approved_at'] = null;
                $data['manager' . $i . '_notes'] = null;
            }

            // Assign managers based on flow
            foreach ($flow as $index => $managerId) {
                $i = $index + 1;
                if ($i <= 4) {
                    $data['manager' . $i . '_id'] = $managerId;
                }
            }

            $incident->update($data);

            // Create history record
            IncidentStatusHistory::create([
                'incident_report_id' => $incident->id,
                'old_status' => $incident->status,
                'new_status' => $incident->status,
                'old_approval_status' => null,
                'new_approval_status' => 'pending',
                'notes' => 'Approval flow set by ' . $user->first_name . ' ' . $user->last_name . ' with ' . count($flow) . ' managers',
                'updated_by' => $user->id,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Approval flow set successfully',
                'data' => $incident->load(['manager1', 'manager2', 'manager3', 'manager4']),
            ]);
        } catch (\Exception $e) {
            Log::error('Error setting approval flow: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to set approval flow: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ APPROVE BY MANAGER ============
    public function managerApprove(Request $request, $id, $managerLevel)
    {
        try {
            $incident = IncidentReport::findOrFail($id);

            if ($managerLevel < 1 || $managerLevel > 4) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid manager level',
                ], 400);
            }

            $statusField = 'manager' . $managerLevel . '_status';
            $notesField = 'manager' . $managerLevel . '_notes';
            $dateField = 'manager' . $managerLevel . '_approved_at';

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:approved,rejected',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Use DB::table to avoid any model casting issues
            $now = date('Y-m-d H:i:s');

            $updateData = [
                $statusField => $request->status,
                $notesField => $request->notes ?? null,
                $dateField => $now,
            ];

            // Update directly using the query builder
            \DB::table('incident_reports')
                ->where('id', $incident->id)
                ->update($updateData);

            // Refresh the model
            $incident->refresh();

            // Update approval status using query builder
            $flow = $incident->approval_flow;
            if ($flow) {
                $flowArray = is_string($flow) ? json_decode($flow, true) : $flow;
                if (is_array($flowArray)) {
                    $total = count($flowArray);
                    $approved = 0;
                    $rejected = 0;

                    // Get current statuses from database directly
                    $current = \DB::table('incident_reports')
                        ->where('id', $incident->id)
                        ->first();

                    for ($i = 1; $i <= $total && $i <= 4; $i++) {
                        $field = 'manager' . $i . '_status';
                        $status = $current->$field ?? 'pending';
                        if ($status === 'approved') {
                            $approved++;
                        } elseif ($status === 'rejected') {
                            $rejected++;
                        }
                    }

                    $newApprovalStatus = 'in_progress';
                    $newStatus = $incident->status;

                    if ($rejected > 0) {
                        $newApprovalStatus = 'rejected';
                        $newStatus = 'rejected';
                    } elseif ($approved === $total) {
                        $newApprovalStatus = 'approved';
                        $newStatus = 'in_review';
                    } elseif ($approved > 0 && $approved < $total) {
                        $newApprovalStatus = 'partially_approved';
                    }

                    // Update approval status
                    \DB::table('incident_reports')
                        ->where('id', $incident->id)
                        ->update([
                            'approval_status' => $newApprovalStatus,
                            'status' => $newStatus,
                        ]);

                    $incident->refresh();
                }
            }

            // Create history record
            \DB::table('incident_status_histories')->insert([
                'incident_report_id' => $incident->id,
                'old_status' => $incident->status,
                'new_status' => $incident->status,
                'old_approval_status' => $incident->approval_status,
                'new_approval_status' => $incident->approval_status,
                'notes' => 'Manager ' . $managerLevel . ' ' . $request->status . ': ' . ($request->notes ?? 'No notes'),
                'updated_by' => auth()->id() ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Refresh again to get latest data
            $incident = IncidentReport::with(['manager1', 'manager2', 'manager3', 'manager4'])
                ->find($id);

            return response()->json([
                'status' => 'success',
                'message' => 'Manager ' . $managerLevel . ' ' . $request->status . ' successfully',
                'data' => $incident,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in manager approval: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to process approval: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ GET STATUS HISTORY ============
    public function getStatusHistory($id)
    {
        try {
            $incident = IncidentReport::findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $incident->statusHistoryWithUsers,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching status history: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch status history: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ DELETE INCIDENT ============
    public function destroy($id)
    {
        try {
            $incident = IncidentReport::findOrFail($id);

            // Delete related status histories
            $incident->statusHistories()->delete();
            $incident->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Incident deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting incident: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete incident: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ GET STATISTICS ============
    public function stats()
    {
        try {
            $stats = [
                'total' => IncidentReport::count(),
                'by_status' => IncidentReport::select('status', DB::raw('count(*) as count'))
                    ->groupBy('status')
                    ->get(),
                'by_category' => IncidentReport::select('category', DB::raw('count(*) as count'))
                    ->groupBy('category')
                    ->get(),
                'by_severity' => IncidentReport::select('severity', DB::raw('count(*) as count'))
                    ->groupBy('severity')
                    ->get(),
                'by_approval_status' => IncidentReport::select('approval_status', DB::raw('count(*) as count'))
                    ->groupBy('approval_status')
                    ->get(),
                'pending_approval' => IncidentReport::where('approval_status', 'pending')->count(),
                'under_investigation' => IncidentReport::where('status', 'under_investigation')->count(),
                'resolved_this_month' => IncidentReport::whereMonth('resolved_date', now()->month)->count(),
                'critical_incidents' => IncidentReport::where('severity', 'critical')->count(),
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
