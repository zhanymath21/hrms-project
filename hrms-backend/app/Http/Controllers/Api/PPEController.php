<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PPEItem;
use App\Models\PPECategory;
use App\Models\PPEHistory;
use App\Models\Employee;
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
        $categories = PPECategory::withCount('items')->orderBy('name')->get();
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
        $query = PPEItem::query();
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $stats = [
            'total' => (clone $query)->count(),
            'available' => (clone $query)->where('status', 'available')->count(),
            'assigned' => (clone $query)->where('status', 'assigned')->count(),
            'maintenance' => (clone $query)->where('status', 'maintenance')->count(),
            'write_off' => (clone $query)->where('status', 'write_off')->count(),
            'good' => (clone $query)->where('condition', 'good')->count(),
            'damaged' => (clone $query)->whereIn('condition', ['damaged', 'poor'])->count(),
            'expired' => (clone $query)->where(function ($q) {
                $q->where('condition', 'expired')->orWhere('expiry_date', '<', now());
            })->count(),
        ];

        return response()->json(['status' => 'success', 'data' => $stats]);
    }

    /**
     * Get all PPE items with filters & pagination
     */

    public function index(Request $request): JsonResponse
    {
        try {
            $query = PPEItem::with(['category:id,name,code']);

            // Search
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

            // Basic filters
            if ($request->filled('category_id')) $query->where('category_id', $request->category_id);
            if ($request->filled('status')) $query->where('status', $request->status);
            if ($request->filled('condition')) $query->where('condition', $request->condition);
            if ($request->filled('location')) $query->where('location', 'like', "%{$request->location}%");

            // ========== DATE FILTERS - TAMBAHKAN INI ==========
            if ($request->filled('start_date')) {
                $query->whereDate('created_at', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->whereDate('created_at', '<=', $request->end_date);
            }

            // Jika ada filter date_preset, bisa digunakan untuk logging saja
            if ($request->filled('date_preset')) {
                \Log::info('Date preset used:', ['preset' => $request->date_preset]);
            }

            $perPage = min((int) $request->input('per_page', 15), 100);
            $items = $query->orderBy('name')->paginate($perPage);

            // Fix holder_name jika kosong
            $items->getCollection()->transform(function ($item) {
                if ($item->current_holder_id && !$item->current_holder_name) {
                    $employee = Employee::find($item->current_holder_id);
                    if ($employee) {
                        $item->current_holder_name = $employee->last_name ?? $employee->first_name ?? '';
                        $item->current_holder_department = $employee->department->name ?? '';
                        $item->current_holder_position = $employee->position->title ?? '';
                        $item->save();
                    }
                }
                return $item;
            });

            return response()->json(['status' => 'success', 'data' => $items]);
        } catch (\Exception $e) {
            \Log::error('PPE index error: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
    /**
     * Get single PPE item
     */
    public function show($id): JsonResponse
    {
        $item = PPEItem::with(['category', 'currentHolder', 'creator'])->find($id);
        if (!$item) {
            return response()->json(['status' => 'error', 'message' => 'PPE item not found'], 404);
        }
        return response()->json(['status' => 'success', 'data' => $item]);
    }

    /**
     * Create PPE item
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
            'description' => 'nullable|string',
            'expiry_date' => 'nullable|date',
            'status' => 'required|in:available,assigned,maintenance,write_off',
            'condition' => 'required|in:good,fair,poor,damaged,expired',
            'current_holder_id' => 'nullable|exists:employees,id',
            'current_holder_name' => 'nullable|string|max:255',
            'current_holder_department' => 'nullable|string|max:255',
            'current_holder_position' => 'nullable|string|max:255',
            'expected_return_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $employeeId = auth()->id() ?? auth('employee')->id();
            $employeeName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

            // ✅ Fix holder_name
            $holderName = $request->current_holder_name;
            if (!$holderName && $request->current_holder_id) {
                $emp = Employee::find($request->current_holder_id);
                $holderName = $emp ? ($emp->last_name ?? $emp->first_name ?? '') : '';
            }

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
                'description' => $request->description,
                'expiry_date' => $request->expiry_date,
                'status' => $request->current_holder_id ? 'assigned' : $request->status,
                'condition' => $request->condition,
                'current_holder_id' => $request->current_holder_id,
                'current_holder_name' => $holderName,
                'current_holder_department' => $request->current_holder_department,
                'current_holder_position' => $request->current_holder_position,
                'assigned_at' => $request->current_holder_id ? now() : null,
                'expected_return_date' => $request->expected_return_date,
                'created_by' => $employeeId,
            ]);

            // Log history
            PPEHistory::create([
                'ppe_item_id' => $item->id,
                'action_type' => 'created',
                'new_data' => $item->toArray(),
                'description' => "PPE '{$item->name}' created" . ($holderName ? " and assigned to {$holderName}" : ''),
                'performed_by' => $employeeId,
                'performed_by_name' => $employeeName,
            ]);

            DB::commit();
            return response()->json(['status' => 'success', 'message' => 'PPE created', 'data' => $item->load('category')], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('PPE create error: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update PPE item
     */
    public function update(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => "required|string|max:50|unique:ppe_items,code,{$id}",
            'category_id' => 'required|exists:ppe_categories,id',
            'status' => 'required|in:available,assigned,maintenance,write_off',
            'condition' => 'required|in:good,fair,poor,damaged,expired',
            'current_holder_id' => 'nullable|exists:employees,id',
            'current_holder_name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $employeeId = auth()->id() ?? auth('employee')->id();
        $employeeName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

        // Save old data
        $oldData = ['name' => $item->name, 'location' => $item->location, 'condition' => $item->condition, 'status' => $item->status, 'holder' => $item->current_holder_name];

        // ✅ Fix holder_name
        $holderName = $request->current_holder_name;
        if (!$holderName && $request->current_holder_id) {
            $emp = Employee::find($request->current_holder_id);
            $holderName = $emp ? ($emp->last_name ?? $emp->first_name ?? '') : '';
        }

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
            'description' => $request->description,
            'expiry_date' => $request->expiry_date,
            'status' => $request->current_holder_id ? 'assigned' : $request->status,
            'condition' => $request->condition,
            'current_holder_id' => $request->current_holder_id,
            'current_holder_name' => $holderName,
            'current_holder_department' => $request->current_holder_department,
            'current_holder_position' => $request->current_holder_position,
            'assigned_at' => $request->current_holder_id && !$item->assigned_at ? now() : $item->assigned_at,
            'expected_return_date' => $request->expected_return_date,
            'updated_by' => $employeeId,
        ]);

        $item->refresh();

        // Track changes
        if ($oldData['location'] !== $item->location) {
            PPEHistory::create([
                'ppe_item_id' => $item->id,
                'action_type' => 'moved',
                'old_data' => ['location' => $oldData['location']],
                'new_data' => ['location' => $item->location],
                'description' => "Moved from '{$oldData['location']}' to '{$item->location}'",
                'performed_by' => $employeeId,
                'performed_by_name' => $employeeName,
            ]);
        }

        if ($oldData['condition'] !== $item->condition) {
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

        if ($oldData['holder'] !== $item->current_holder_name) {
            PPEHistory::create([
                'ppe_item_id' => $item->id,
                'action_type' => $item->current_holder_id ? 'assigned' : 'returned',
                'old_data' => ['holder' => $oldData['holder']],
                'new_data' => ['holder' => $item->current_holder_name],
                'description' => $item->current_holder_id ? "Assigned to {$item->current_holder_name}" : "Returned from {$oldData['holder']}",
                'performed_by' => $employeeId,
                'performed_by_name' => $employeeName,
            ]);
        }

        return response()->json(['status' => 'success', 'message' => 'PPE updated', 'data' => $item->load('category')]);
    }

    /**
     * Delete PPE (soft delete)
     */
    public function destroy($id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);

        $employeeId = auth()->id() ?? auth('employee')->id();
        $item->update(['deleted_by' => $employeeId]);
        $item->delete();

        return response()->json(['status' => 'success', 'message' => 'PPE deleted']);
    }

    /**
     * Assign PPE to employee
     */
    public function assign(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);
        if ($item->status !== 'available') return response()->json(['status' => 'error', 'message' => 'Not available. Current: ' . $item->status], 400);

        $validator = Validator::make($request->all(), [
            'current_holder_id' => 'required|exists:employees,id',
            'current_holder_name' => 'nullable|string|max:255',
            'current_holder_department' => 'nullable|string|max:255',
            'current_holder_position' => 'nullable|string|max:255',
            'expected_return_date' => 'nullable|date',
            'location' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        // ✅ Fix holder_name
        $holderName = $request->current_holder_name;
        if (!$holderName && $request->current_holder_id) {
            $emp = Employee::find($request->current_holder_id);
            $holderName = $emp ? ($emp->last_name ?? $emp->first_name ?? '') : '';
        }

        $oldHolder = $item->current_holder_name;
        $oldLocation = $item->location;

        $item->update([
            'current_holder_id' => $request->current_holder_id,
            'current_holder_name' => $holderName,
            'current_holder_department' => $request->current_holder_department,
            'current_holder_position' => $request->current_holder_position,
            'assigned_at' => now(),
            'expected_return_date' => $request->expected_return_date,
            'status' => 'assigned',
            'location' => $request->location ?? $item->location,
        ]);

        $employeeId = auth()->id() ?? auth('employee')->id();
        $employeeName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'assigned',
            'old_data' => ['holder' => $oldHolder, 'status' => 'available', 'location' => $oldLocation],
            'new_data' => ['holder' => $holderName, 'status' => 'assigned', 'location' => $item->location],
            'description' => "Assigned to {$holderName}" . ($request->location && $request->location !== $oldLocation ? " at '{$request->location}'" : ''),
            'performed_by' => $employeeId,
            'performed_by_name' => $employeeName,
        ]);

        return response()->json(['status' => 'success', 'message' => 'PPE assigned', 'data' => $item->fresh()->load('category')]);
    }

    /**
     * Return PPE from employee
     */
    public function return($id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);
        if ($item->status !== 'assigned') return response()->json(['status' => 'error', 'message' => 'Not assigned. Current: ' . $item->status], 400);

        $oldHolder = $item->current_holder_name;
        $oldHolderId = $item->current_holder_id;

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

        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'returned',
            'old_data' => ['holder' => $oldHolder, 'holder_id' => $oldHolderId, 'status' => 'assigned'],
            'new_data' => ['holder' => null, 'status' => 'available'],
            'description' => "Returned by {$oldHolder}",
            'performed_by' => $employeeId,
            'performed_by_name' => $employeeName,
        ]);

        return response()->json(['status' => 'success', 'message' => 'PPE returned', 'data' => $item->fresh()->load('category')]);
    }

    /**
     * Move PPE location
     */
    public function move(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);

        $validator = Validator::make($request->all(), [
            'location' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $oldLocation = $item->location;
        $item->update(['location' => $request->location]);

        $employeeId = auth()->id() ?? auth('employee')->id();
        $employeeName = auth()->user()->first_name . ' ' . auth()->user()->last_name;

        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'moved',
            'old_data' => ['location' => $oldLocation],
            'new_data' => ['location' => $item->location],
            'description' => "Moved from '{$oldLocation}' to '{$item->location}'",
            'performed_by' => $employeeId,
            'performed_by_name' => $employeeName,
        ]);

        return response()->json(['status' => 'success', 'message' => 'Location updated', 'data' => $item->fresh()->load('category')]);
    }

    /**
     * Write-off PPE
     */
    public function writeOff(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);
        if ($item->status === 'write_off') return response()->json(['status' => 'error', 'message' => 'Already written off'], 400);

        $validator = Validator::make($request->all(), [
            'write_off_reason' => 'required|in:expired,damaged,lost,stolen,obsolete,recalled,replaced,other',
            'write_off_notes' => 'nullable|string|max:500',
            'write_off_approval_number' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
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

        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'write_off',
            'old_data' => ['status' => $oldStatus],
            'new_data' => ['status' => 'write_off', 'reason' => $request->write_off_reason],
            'description' => "Written off - {$request->write_off_reason}",
            'notes' => $request->write_off_notes,
            'performed_by' => $employeeId,
            'performed_by_name' => $employeeName,
        ]);

        return response()->json(['status' => 'success', 'message' => 'PPE written off', 'data' => $item->fresh()->load('category')]);
    }

    /**
     * Get PPE history
     */
    public function history($id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);

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

        return response()->json(['status' => 'success', 'data' => $histories]);
    }
}
