<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PPEItem;
use App\Models\PPECategory;
use App\Models\PPEHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PPEController extends Controller
{
    /**
     * Get all PPE categories
     */
    public function categories(): JsonResponse
    {
        $categories = PPECategory::orderBy('name')->get();
        return response()->json([
            'status' => 'success',
            'data' => $categories,
        ]);
    }

    /**
     * Get PPE statistics
     */
    public function stats(Request $request): JsonResponse
    {
        try {
            $stats = [
                'total' => PPEItem::count(),
                'available' => PPEItem::where('status', 'available')->count(),
                'assigned' => PPEItem::where('status', 'assigned')->count(),
                'maintenance' => PPEItem::where('status', 'maintenance')->count(),
                'write_off' => PPEItem::where('status', 'write_off')->count(),
                'good' => 0,
                'damaged' => 0,
                'expired' => 0,
            ];

            return response()->json([
                'status' => 'success',
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all PPE items with filters & pagination
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = PPEItem::with(['category:id,name,code']);

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('serial_number', 'like', "%{$search}%")
                        ->orWhere('current_holder_name', 'like', "%{$search}%")
                        ->orWhere('manufacturer', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            }

            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('condition')) {
                $query->where('condition', $request->condition);
            }
            if ($request->filled('location')) {
                $query->where('location', 'like', "%{$request->location}%");
            }

            $perPage = min((int) $request->input('per_page', 15), 100);
            $items = $query->orderBy('name')->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $items,
            ]);
        } catch (\Exception $e) {
            \Log::error('PPE index error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    /**
     * Get single PPE item with relations
     */
    public function show($id): JsonResponse
    {
        $item = PPEItem::with(['category', 'currentHolder', 'creator'])->find($id);

        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE item not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $item,
        ]);
    }

    /**
     * Create new PPE item
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:ppe_items,code',
            'category_id' => 'required|exists:ppe_categories,id',
            'size' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:50',
            'material' => 'nullable|string|max:100',
            'manufacturer' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100|unique:ppe_items,serial_number',
            'location' => 'nullable|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'supplier' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'specifications' => 'nullable|string',
            'certification' => 'nullable|string|max:255',
            'certification_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'status' => 'required|in:available,assigned,maintenance,write_off',
            'condition' => 'required|in:good,fair,poor,damaged,expired',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Get authenticated employee ID
            $employeeId = auth()->id() ?? auth('employee')->id();

            $item = PPEItem::create([
                'name' => $request->name,
                'code' => strtoupper($request->code),
                'category_id' => $request->category_id,
                'size' => $request->size,
                'color' => $request->color,
                'material' => $request->material,
                'manufacturer' => $request->manufacturer,
                'model' => $request->model,
                'serial_number' => $request->serial_number,
                'location' => $request->location,
                'price' => $request->price,
                'purchase_date' => $request->purchase_date,
                'supplier' => $request->supplier,
                'invoice_number' => $request->invoice_number,
                'description' => $request->description,
                'specifications' => $request->specifications,
                'certification' => $request->certification,
                'certification_date' => $request->certification_date,
                'expiry_date' => $request->expiry_date,
                'status' => $request->status,
                'condition' => $request->condition,
                'created_by' => $employeeId,
            ]);

            // Get creator name for history
            $creatorName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

            // Log history
            PPEHistory::create([
                'ppe_item_id' => $item->id,
                'action_type' => 'created',
                'new_data' => $item->toArray(),
                'description' => "PPE '{$item->name}' was created",
                'performed_by' => $employeeId,
                'performed_by_name' => $creatorName,
            ]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'PPE item created successfully',
                'data' => $item->load('category'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('PPE create error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create PPE item: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update PPE item
     */
    public function update(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE item not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => "required|string|max:50|unique:ppe_items,code,{$id}",
            'category_id' => 'required|exists:ppe_categories,id',
            'size' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:50',
            'material' => 'nullable|string|max:100',
            'manufacturer' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:100',
            'serial_number' => "nullable|string|max:100|unique:ppe_items,serial_number,{$id}",
            'location' => 'nullable|string|max:255',
            'status' => 'required|in:available,assigned,maintenance,write_off',
            'condition' => 'required|in:good,fair,poor,damaged,expired',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $employeeId = auth()->id() ?? auth('employee')->id();
        $employeeName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

        // Save old data for history
        $oldData = [
            'name' => $item->name,
            'location' => $item->location,
            'condition' => $item->condition,
            'status' => $item->status,
        ];

        // Update item
        $item->update([
            'name' => $request->name,
            'code' => strtoupper($request->code),
            'category_id' => $request->category_id,
            'size' => $request->size,
            'color' => $request->color,
            'material' => $request->material,
            'manufacturer' => $request->manufacturer,
            'model' => $request->model,
            'serial_number' => $request->serial_number,
            'location' => $request->location,
            'price' => $request->price,
            'purchase_date' => $request->purchase_date,
            'supplier' => $request->supplier,
            'invoice_number' => $request->invoice_number,
            'description' => $request->description,
            'specifications' => $request->specifications,
            'certification' => $request->certification,
            'certification_date' => $request->certification_date,
            'expiry_date' => $request->expiry_date,
            'status' => $request->status,
            'condition' => $request->condition,
            'updated_by' => $employeeId,
        ]);

        $item->refresh();

        // Track changes
        $changes = [];

        if ($oldData['location'] !== $item->location) {
            $changes[] = "Location changed from '{$oldData['location']}' to '{$item->location}'";
            PPEHistory::create([
                'ppe_item_id' => $item->id,
                'action_type' => 'moved',
                'old_data' => ['location' => $oldData['location']],
                'new_data' => ['location' => $item->location],
                'description' => "Location changed from '{$oldData['location']}' to '{$item->location}'",
                'performed_by' => $employeeId,
                'performed_by_name' => $employeeName,
            ]);
        }

        if ($oldData['condition'] !== $item->condition) {
            $changes[] = "Condition changed from '{$oldData['condition']}' to '{$item->condition}'";
            PPEHistory::create([
                'ppe_item_id' => $item->id,
                'action_type' => 'condition_change',
                'old_data' => ['condition' => $oldData['condition']],
                'new_data' => ['condition' => $item->condition],
                'description' => "Condition changed from '{$oldData['condition']}' to '{$item->condition}'",
                'performed_by' => $employeeId,
                'performed_by_name' => $employeeName,
            ]);
        }

        if (empty($changes)) {
            PPEHistory::create([
                'ppe_item_id' => $item->id,
                'action_type' => 'updated',
                'old_data' => $oldData,
                'new_data' => $item->toArray(),
                'description' => "PPE '{$item->name}' was updated",
                'performed_by' => $employeeId,
                'performed_by_name' => $employeeName,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'PPE item updated successfully',
            'data' => $item->load('category'),
        ]);
    }

    /**
     * Delete PPE item (soft delete)
     */
    public function destroy($id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE item not found',
            ], 404);
        }

        $employeeId = auth()->id() ?? auth('employee')->id();
        $employeeName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

        $item->update(['deleted_by' => $employeeId]);
        $item->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'PPE item deleted successfully',
        ]);
    }

    // ==========================================
    // ASSIGN, RETURN, MOVE, WRITE-OFF
    // ==========================================

    /**
     * Assign PPE to employee
     * POST /api/ppe/{id}/assign
     */
    public function assign(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE item not found',
            ], 404);
        }

        // Cek apakah item tersedia
        if ($item->status !== 'available') {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE item is not available. Current status: ' . $item->status,
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'current_holder_id' => 'required|exists:employees,id',
            'current_holder_name' => 'required|string|max:255',
            'current_holder_department' => 'nullable|string|max:255',
            'current_holder_position' => 'nullable|string|max:255',
            'expected_return_date' => 'nullable|date',
            'location' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $oldHolder = $item->current_holder_name;
        $oldLocation = $item->location;

        // Update item
        $item->update([
            'current_holder_id' => $request->current_holder_id,
            'current_holder_name' => $request->current_holder_name,
            'current_holder_department' => $request->current_holder_department,
            'current_holder_position' => $request->current_holder_position,
            'assigned_at' => now(),
            'expected_return_date' => $request->expected_return_date,
            'status' => 'assigned',
            'location' => $request->location ?? $item->location,
        ]);

        $employeeId = auth()->id() ?? auth('employee')->id();
        $employeeName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

        // Log history
        $description = "Assigned to {$item->current_holder_name}";
        if ($request->location && $request->location !== $oldLocation) {
            $description .= " at location '{$request->location}'";
        }

        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'assigned',
            'old_data' => [
                'holder' => $oldHolder,
                'status' => 'available',
                'location' => $oldLocation,
            ],
            'new_data' => [
                'holder' => $item->current_holder_name,
                'status' => 'assigned',
                'location' => $item->location,
            ],
            'description' => $description,
            'performed_by' => $employeeId,
            'performed_by_name' => $employeeName,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'PPE assigned successfully',
            'data' => $item->fresh()->load(['category', 'currentHolder']),
        ]);
    }

    /**
     * Return PPE from employee
     * POST /api/ppe/{id}/return
     */
    public function return($id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE item not found',
            ], 404);
        }

        // Cek apakah item sedang di-assign
        if ($item->status !== 'assigned') {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE is not currently assigned. Current status: ' . $item->status,
            ], 400);
        }

        $oldHolder = $item->current_holder_name;
        $oldHolderId = $item->current_holder_id;

        // Clear holder info
        $item->update([
            'current_holder_id' => null,
            'current_holder_name' => null,
            'current_holder_department' => null,
            'current_holder_position' => null,
            'assigned_at' => null,
            'expected_return_date' => null,
            'status' => 'available',
        ]);

        $employeeId = auth()->id() ?? auth('employee')->id();
        $employeeName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

        // Log history
        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'returned',
            'old_data' => [
                'holder' => $oldHolder,
                'holder_id' => $oldHolderId,
                'status' => 'assigned',
            ],
            'new_data' => [
                'holder' => null,
                'status' => 'available',
            ],
            'description' => "Returned by {$oldHolder}",
            'performed_by' => $employeeId,
            'performed_by_name' => $employeeName,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'PPE returned successfully',
            'data' => $item->fresh()->load('category'),
        ]);
    }

    /**
     * Move PPE to new location
     * POST /api/ppe/{id}/move
     */
    public function move(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE item not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'location' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $oldLocation = $item->location;

        $item->update([
            'location' => $request->location,
        ]);

        $employeeId = auth()->id() ?? auth('employee')->id();
        $employeeName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

        // Log history
        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'moved',
            'old_data' => ['location' => $oldLocation],
            'new_data' => ['location' => $item->location],
            'description' => "Moved from '{$oldLocation}' to '{$item->location}'",
            'performed_by' => $employeeId,
            'performed_by_name' => $employeeName,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'PPE location updated successfully',
            'data' => $item->fresh()->load('category'),
        ]);
    }

    /**
     * Write-off PPE
     * POST /api/ppe/{id}/write-off
     */
    public function writeOff(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE item not found',
            ], 404);
        }

        // Cek jangan write-off yang sudah write-off
        if ($item->status === 'write_off') {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE is already written off',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'write_off_reason' => 'required|in:expired,damaged,lost,stolen,obsolete,recalled,replaced,other',
            'write_off_notes' => 'nullable|string|max:500',
            'write_off_approval_number' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $oldStatus = $item->status;
        $employeeId = auth()->id() ?? auth('employee')->id();
        $employeeName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

        $item->update([
            'status' => 'write_off',
            'write_off_date' => now(),
            'write_off_by' => $employeeId,
            'write_off_reason' => $request->write_off_reason,
            'write_off_notes' => $request->write_off_notes,
            'write_off_approval_number' => $request->write_off_approval_number,
        ]);

        // Log history
        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'write_off',
            'old_data' => ['status' => $oldStatus],
            'new_data' => [
                'status' => 'write_off',
                'reason' => $request->write_off_reason,
            ],
            'description' => "Written off - Reason: {$request->write_off_reason}",
            'notes' => $request->write_off_notes,
            'performed_by' => $employeeId,
            'performed_by_name' => $employeeName,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'PPE written off successfully',
            'data' => $item->fresh()->load('category'),
        ]);
    }

    /**
     * Get PPE history timeline
     * GET /api/ppe/{id}/history
     */
    public function history($id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'PPE item not found',
            ], 404);
        }

        $histories = PPEHistory::where('ppe_item_id', $id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($h) {
                return [
                    'id' => $h->id,
                    'action_type' => $h->action_type,
                    'old_data' => $h->old_data,
                    'new_data' => $h->new_data,
                    'description' => $h->description,
                    'notes' => $h->notes,
                    'performed_by' => $h->performed_by,
                    'performed_by_name' => $h->performed_by_name,
                    'created_at' => $h->created_at,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $histories,
        ]);
    }
}
