<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LostTimeInjury;
use App\Models\LostTimeInjuryHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class LostTimeInjuryController extends Controller
{
    // ============ LIST ALL LOST TIME INJURIES ============
    public function index(Request $request)
    {
        try {
            $query = LostTimeInjury::with(['employee', 'reportedBy']);

            if ($request->has('status')) {
                $query->byStatus($request->status);
            }
            if ($request->has('employee_id')) {
                $query->byEmployee($request->employee_id);
            }
            if ($request->has('date_from')) {
                $query->whereDate('injury_date', '>=', $request->date_from);
            }
            if ($request->has('date_to')) {
                $query->whereDate('injury_date', '<=', $request->date_to);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            }

            $ltis = $query->orderBy('injury_date', 'desc')->paginate($request->per_page ?? 15);

            return response()->json([
                'status' => 'success',
                'data' => $ltis,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching LTIs: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch data',
            ], 500);
        }
    }

    // ============ GET SINGLE LOST TIME INJURY ============
    public function show($id)
    {
        try {
            $lti = LostTimeInjury::with([
                'employee',
                'reportedBy',
                'createdBy',
                'manager1',
                'manager2',
                'manager3',
                'manager4',
                'statusHistories.updatedBy'
            ])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $lti,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data not found',
            ], 404);
        }
    }

    // ============ CREATE LOST TIME INJURY ============
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employees,id',
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'location' => 'nullable|string|max:255',
                'injury_date' => 'required|date',
                'injury_time' => 'nullable|date_format:H:i',
                'body_part' => 'nullable|string',
                'injury_type' => 'nullable|string',
                'severity' => 'nullable|in:minor,moderate,severe,critical',
                'medical_treatment' => 'boolean',
                'return_to_work_date' => 'nullable|date|after:injury_date',
                'days_lost' => 'nullable|integer|min:0',
                'medical_notes' => 'nullable|string',
                'witnesses' => 'nullable|json',
                'file' => 'nullable|file|max:10240',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::guard('api')->user();
            $data = $request->all();
            $data['reported_by'] = $user->id;
            $data['created_by'] = $user->id;
            $data['status'] = 'reported';
            $data['approval_status'] = 'pending';

            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $fileName = time() . '_' . $file->getClientOriginalName();
                $filePath = $file->storeAs('lost_time_injuries', $fileName, 'public');
                $data['file_path'] = $filePath;
                $data['file_name'] = $file->getClientOriginalName();
            }

            if ($request->has('witnesses')) {
                $witnesses = $request->witnesses;
                if (is_string($witnesses)) {
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

            $lti = LostTimeInjury::create($data);

            return response()->json([
                'status' => 'success',
                'message' => 'Lost Time Injury created successfully',
                'data' => $lti->load(['employee', 'reportedBy']),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating LTI: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ UPDATE LOST TIME INJURY ============
    public function update(Request $request, $id)
    {
        try {
            $lti = LostTimeInjury::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'employee_id' => 'sometimes|exists:employees,id',
                'title' => 'sometimes|string|max:255',
                'description' => 'sometimes|string',
                'location' => 'nullable|string|max:255',
                'injury_date' => 'sometimes|date',
                'injury_time' => 'nullable|date_format:H:i',
                'body_part' => 'nullable|string',
                'injury_type' => 'nullable|string',
                'severity' => 'nullable|in:minor,moderate,severe,critical',
                'medical_treatment' => 'boolean',
                'return_to_work_date' => 'nullable|date',
                'days_lost' => 'nullable|integer|min:0',
                'medical_notes' => 'nullable|string',
                'witnesses' => 'nullable|json',
                'file' => 'nullable|file|max:10240',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $data = $request->all();

            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $fileName = time() . '_' . $file->getClientOriginalName();
                $filePath = $file->storeAs('lost_time_injuries', $fileName, 'public');
                $data['file_path'] = $filePath;
                $data['file_name'] = $file->getClientOriginalName();
            }

            if ($request->has('witnesses')) {
                $witnesses = $request->witnesses;
                if (is_string($witnesses)) {
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
            }

            $lti->update($data);

            return response()->json([
                'status' => 'success',
                'message' => 'Lost Time Injury updated successfully',
                'data' => $lti->load(['employee', 'reportedBy']),
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating LTI: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ UPDATE STATUS ============
    public function updateStatus(Request $request, $id)
    {
        try {
            $lti = LostTimeInjury::findOrFail($id);

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

            $oldStatus = $lti->status;
            $newStatus = $request->status;

            $lti->status = $newStatus;

            if ($newStatus === 'resolved' || $newStatus === 'closed') {
                $lti->resolved_date = now();
            }

            if ($request->has('resolution_notes')) {
                $lti->resolution_notes = $request->resolution_notes;
            }

            $lti->save();

            LostTimeInjuryHistory::create([
                'lost_time_injury_id' => $lti->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'notes' => $request->notes ?? 'Status updated',
                'updated_by' => auth()->id() ?? null,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Status updated successfully',
                'data' => $lti->load(['employee', 'reportedBy']),
            ]);
        } catch (\Exception $e) {
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
            $lti = LostTimeInjury::findOrFail($id);
            $user = Auth::guard('api')->user();

            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthenticated',
                ], 401);
            }

            // Only reporter can set approval flow
            $isReporter = $lti->reported_by === $user->id;

            if (!$isReporter) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Only the reporter can set approval flow',
                ], 403);
            }

            if (in_array($lti->approval_status, ['approved', 'rejected'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot update approval flow. Already ' . $lti->approval_status,
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

            if (count($flow) > 4) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Maximum 4 managers allowed',
                ], 400);
            }

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

            for ($i = 1; $i <= 4; $i++) {
                $data['manager' . $i . '_id'] = null;
                $data['manager' . $i . '_status'] = 'pending';
                $data['manager' . $i . '_approved_at'] = null;
                $data['manager' . $i . '_notes'] = null;
            }

            foreach ($flow as $index => $managerId) {
                $i = $index + 1;
                if ($i <= 4) {
                    $data['manager' . $i . '_id'] = $managerId;
                }
            }

            $lti->update($data);

            LostTimeInjuryHistory::create([
                'lost_time_injury_id' => $lti->id,
                'old_status' => $lti->status,
                'new_status' => $lti->status,
                'old_approval_status' => null,
                'new_approval_status' => 'pending',
                'notes' => 'Approval flow set by ' . $user->first_name . ' ' . $user->last_name . ' with ' . count($flow) . ' managers',
                'updated_by' => $user->id,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Approval flow set successfully',
                'data' => $lti->load(['manager1', 'manager2', 'manager3', 'manager4']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to set approval flow: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ MANAGER APPROVE ============
    public function managerApprove(Request $request, $id, $managerLevel)
    {
        try {
            $lti = LostTimeInjury::findOrFail($id);
            $user = Auth::guard('api')->user();

            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthenticated',
                ], 401);
            }

            $managerField = 'manager' . $managerLevel . '_id';
            $isManager = $lti->$managerField === $user->id;

            if (!$isManager) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You are not authorized to approve this level',
                ], 403);
            }

            $statusField = 'manager' . $managerLevel . '_status';
            if (in_array($lti->$statusField, ['approved', 'rejected'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You have already ' . $lti->$statusField . ' this request',
                ], 400);
            }

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

            $lti->$statusField = $request->status;
            $lti->{'manager' . $managerLevel . '_notes'} = $request->notes ?? null;
            $lti->{'manager' . $managerLevel . '_approved_at'} = now();

            // Update approval status
            $flow = $lti->approval_flow;
            if ($flow) {
                $flowArray = is_string($flow) ? json_decode($flow, true) : $flow;
                if (is_array($flowArray)) {
                    $total = count($flowArray);
                    $approved = 0;
                    $rejected = 0;

                    for ($i = 1; $i <= $total && $i <= 4; $i++) {
                        $field = 'manager' . $i . '_status';
                        if ($lti->$field === 'approved') $approved++;
                        elseif ($lti->$field === 'rejected') $rejected++;
                    }

                    if ($rejected > 0) {
                        $lti->approval_status = 'rejected';
                        $lti->status = 'rejected';
                    } elseif ($approved === $total) {
                        $lti->approval_status = 'approved';
                        $lti->status = 'in_review';
                    } elseif ($approved > 0 && $approved < $total) {
                        $lti->approval_status = 'partially_approved';
                    } else {
                        $lti->approval_status = 'in_progress';
                    }
                }
            }

            $lti->save();

            LostTimeInjuryHistory::create([
                'lost_time_injury_id' => $lti->id,
                'old_status' => $lti->status,
                'new_status' => $lti->status,
                'old_approval_status' => $lti->approval_status,
                'new_approval_status' => $lti->approval_status,
                'notes' => 'Manager ' . $managerLevel . ' ' . $request->status,
                'updated_by' => $user->id,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Manager ' . $managerLevel . ' ' . $request->status,
                'data' => $lti->load(['manager1', 'manager2', 'manager3', 'manager4']),
            ]);
        } catch (\Exception $e) {
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
            $lti = LostTimeInjury::findOrFail($id);
            return response()->json([
                'status' => 'success',
                'data' => $lti->statusHistoryWithUsers,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch history',
            ], 500);
        }
    }

    // ============ DELETE LOST TIME INJURY ============
    public function destroy($id)
    {
        try {
            $lti = LostTimeInjury::findOrFail($id);
            $lti->statusHistories()->delete();
            $lti->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Lost Time Injury deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============ STATISTICS ============
    public function stats()
    {
        try {
            $stats = [
                'total' => LostTimeInjury::count(),
                'total_days_lost' => LostTimeInjury::sum('days_lost'),
                'by_status' => LostTimeInjury::select('status', DB::raw('count(*) as count'))
                    ->groupBy('status')
                    ->get(),
                'by_severity' => LostTimeInjury::select('severity', DB::raw('count(*) as count'))
                    ->groupBy('severity')
                    ->get(),
                'by_body_part' => LostTimeInjury::select('body_part', DB::raw('count(*) as count'))
                    ->groupBy('body_part')
                    ->get(),
            ];

            return response()->json([
                'status' => 'success',
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch stats',
            ], 500);
        }
    }
}
