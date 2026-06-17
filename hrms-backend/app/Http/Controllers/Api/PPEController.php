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
    // ========== CATEGORIES ==========
    public function categories(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => PPECategory::orderBy('name')->get(),
        ]);
    }

    // ========== STATS ==========
    public function stats(Request $request): JsonResponse
    {
        $query = PPEItem::query();

        if ($request->category_id) {
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
            'expired' => (clone $query)->where('condition', 'expired')->orWhere('expiry_date', '<', now())->count(),
        ];

        return response()->json(['status' => 'success', 'data' => $stats]);
    }

    // ========== LIST ITEMS ==========
    public function index(Request $request): JsonResponse
    {
        $query = PPEItem::with(['category:id,name,code', 'warehouse:id,name,code']);

        // Search
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('code', 'like', "%{$s}%")
                    ->orWhere('serial_number', 'like', "%{$s}%")
                    ->orWhere('current_holder_name', 'like', "%{$s}%")
                    ->orWhere('manufacturer', 'like', "%{$s}%")
                    ->orWhere('location', 'like', "%{$s}%");
            });
        }

        if ($request->category_id) $query->where('category_id', $request->category_id);
        if ($request->status) $query->where('status', $request->status);
        if ($request->condition) $query->where('condition', $request->condition);
        if ($request->warehouse_id) $query->where('warehouse_id', $request->warehouse_id);

        $perPage = min((int) $request->input('per_page', 20), 100);
        $items = $query->orderBy('name')->paginate($perPage);

        return response()->json(['status' => 'success', 'data' => $items]);
    }

    // ========== SHOW ITEM ==========
    public function show($id): JsonResponse
    {
        $item = PPEItem::with(['category', 'warehouse', 'currentHolder', 'creator'])->find($id);
        if (!$item) {
            return response()->json(['status' => 'error', 'message' => 'Not found'], 404);
        }
        return response()->json(['status' => 'success', 'data' => $item]);
    }

    // ========== CREATE ==========
    public function store(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:ppe_items,code',
            'category_id' => 'required|exists:ppe_categories,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'location' => 'nullable|string|max:255',
            'status' => 'required|in:available,assigned,maintenance,write_off',
            'condition' => 'required|in:good,fair,poor,damaged,expired',
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $item = PPEItem::create([...$request->all(), 'created_by' => auth()->id()]);

            // Log history
            PPEHistory::create([
                'ppe_item_id' => $item->id,
                'action_type' => 'created',
                'new_data' => $item->toArray(),
                'description' => "PPE '{$item->name}' created",
                'performed_by' => auth()->id(),
                'performed_by_name' => auth()->user()->first_name . ' ' . auth()->user()->last_name,
            ]);

            DB::commit();
            return response()->json(['status' => 'success', 'message' => 'PPE created', 'data' => $item->load('category')], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // ========== UPDATE ==========
    public function update(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);

        $v = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => "required|string|max:50|unique:ppe_items,code,{$id}",
            'category_id' => 'required|exists:ppe_categories,id',
            'status' => 'required|in:available,assigned,maintenance,write_off',
            'condition' => 'required|in:good,fair,poor,damaged,expired',
        ]);

        if ($v->fails()) {
            return response()->json(['status' => 'error', 'errors' => $v->errors()], 422);
        }

        $oldData = $item->toArray();
        $oldLocation = $item->location;
        $oldCondition = $item->condition;

        $item->update([...$request->all(), 'updated_by' => auth()->id()]);
        $newData = $item->fresh()->toArray();

        // Log history
        $changes = [];
        if ($oldLocation !== $item->location) {
            $changes[] = "Location changed from '{$oldLocation}' to '{$item->location}'";
            PPEHistory::create([
                'ppe_item_id' => $item->id,
                'action_type' => 'moved',
                'old_data' => ['location' => $oldLocation],
                'new_data' => ['location' => $item->location],
                'description' => implode(', ', $changes),
                'performed_by' => auth()->id(),
                'performed_by_name' => auth()->user()->first_name . ' ' . auth()->user()->last_name,
            ]);
        }

        if ($oldCondition !== $item->condition) {
            PPEHistory::create([
                'ppe_item_id' => $item->id,
                'action_type' => 'condition_change',
                'old_data' => ['condition' => $oldCondition],
                'new_data' => ['condition' => $item->condition],
                'description' => "Condition changed from '{$oldCondition}' to '{$item->condition}'",
                'performed_by' => auth()->id(),
                'performed_by_name' => auth()->user()->first_name . ' ' . auth()->user()->last_name,
            ]);
        }

        return response()->json(['status' => 'success', 'message' => 'PPE updated', 'data' => $item->fresh()->load('category')]);
    }

    // ========== DELETE ==========
    public function destroy($id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);

        $item->update(['deleted_by' => auth()->id()]);
        $item->delete();

        return response()->json(['status' => 'success', 'message' => 'PPE deleted']);
    }

    // ========== ASSIGN TO EMPLOYEE ==========
    public function assign(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);
        if ($item->status !== 'available') return response()->json(['status' => 'error', 'message' => 'Not available'], 400);

        $oldHolder = $item->current_holder_name;

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

        // Log history
        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'assigned',
            'old_data' => ['holder' => $oldHolder, 'status' => 'available'],
            'new_data' => ['holder' => $item->current_holder_name, 'status' => 'assigned'],
            'description' => "Assigned to {$item->current_holder_name}" . ($request->location ? " at {$request->location}" : ''),
            'performed_by' => auth()->id(),
            'performed_by_name' => auth()->user()->first_name . ' ' . auth()->user()->last_name,
        ]);

        return response()->json(['status' => 'success', 'message' => 'PPE assigned', 'data' => $item->fresh()]);
    }

    // ========== RETURN ==========
    public function return($id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);
        if ($item->status !== 'assigned') return response()->json(['status' => 'error', 'message' => 'Not assigned'], 400);

        $oldHolder = $item->current_holder_name;

        $item->update([
            'current_holder_id' => null,
            'current_holder_name' => null,
            'current_holder_department' => null,
            'current_holder_position' => null,
            'assigned_at' => null,
            'expected_return_date' => null,
            'status' => 'available',
        ]);

        // Log history
        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'returned',
            'old_data' => ['holder' => $oldHolder, 'status' => 'assigned'],
            'new_data' => ['holder' => null, 'status' => 'available'],
            'description' => "Returned from {$oldHolder}",
            'performed_by' => auth()->id(),
            'performed_by_name' => auth()->user()->first_name . ' ' . auth()->user()->last_name,
        ]);

        return response()->json(['status' => 'success', 'message' => 'PPE returned', 'data' => $item->fresh()]);
    }

    // ========== MOVE LOCATION ==========
    public function move(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);

        $oldLocation = $item->location;
        $oldWarehouse = $item->warehouse_id;

        $item->update([
            'location' => $request->location,
            'warehouse_id' => $request->warehouse_id,
        ]);

        // Log history
        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'moved',
            'old_data' => ['location' => $oldLocation, 'warehouse_id' => $oldWarehouse],
            'new_data' => ['location' => $item->location, 'warehouse_id' => $item->warehouse_id],
            'description' => "Moved from '{$oldLocation}' to '{$item->location}'",
            'performed_by' => auth()->id(),
            'performed_by_name' => auth()->user()->first_name . ' ' . auth()->user()->last_name,
        ]);

        return response()->json(['status' => 'success', 'message' => 'Location updated', 'data' => $item->fresh()]);
    }

    // ========== WRITE-OFF ==========
    public function writeOff(Request $request, $id): JsonResponse
    {
        $item = PPEItem::find($id);
        if (!$item) return response()->json(['status' => 'error', 'message' => 'Not found'], 404);

        $item->update([
            'status' => 'write_off',
            'write_off_date' => now(),
            'write_off_by' => auth()->id(),
            'write_off_reason' => $request->write_off_reason,
            'write_off_notes' => $request->write_off_notes,
            'write_off_approval_number' => $request->write_off_approval_number,
        ]);

        // Log history
        PPEHistory::create([
            'ppe_item_id' => $item->id,
            'action_type' => 'write_off',
            'old_data' => ['status' => 'available'],
            'new_data' => ['status' => 'write_off', 'reason' => $request->write_off_reason],
            'description' => "Written off: {$request->write_off_reason}",
            'notes' => $request->write_off_notes,
            'performed_by' => auth()->id(),
            'performed_by_name' => auth()->user()->first_name . ' ' . auth()->user()->last_name,
        ]);

        return response()->json(['status' => 'success', 'message' => 'PPE written off', 'data' => $item->fresh()]);
    }

    // ========== HISTORY ==========
    public function history($id): JsonResponse
    {
        $histories = PPEHistory::where('ppe_item_id', $id)
            ->with('performer:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['status' => 'success', 'data' => $histories]);
    }
}
