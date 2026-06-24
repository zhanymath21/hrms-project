<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class PayrollAdjustmentController extends Controller
{
    /**
     * Get payroll item with adjustment data
     */
    public function show($id)
    {
        try {
            $item = PayrollItem::with(['employee', 'payrollPeriod', 'manualAdjustedBy'])
                ->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'id' => $item->id,
                    'employee_name' => $item->employee ? $item->employee->first_name . ' ' . $item->employee->last_name : 'Unknown',
                    'employee_id' => $item->employee_id,
                    'payroll_name' => $item->payrollPeriod ? $item->payrollPeriod->name : 'N/A',
                    'payroll_id' => $item->payroll_period_id,
                    'basic_salary' => $item->basic_salary,
                    'allowance' => $item->allowance,
                    'total_earnings' => $item->total_earnings,
                    'tax' => $item->tax,
                    'social_security' => $item->social_security,
                    'net_pay' => $item->net_pay,
                    'present_days' => $item->present_days,
                    'absent_days' => $item->absent_days,
                    'leave_days' => $item->leave_days,
                    'working_days' => $item->working_days,
                    'override_present_days' => $item->override_present_days,
                    'override_absent_days' => $item->override_absent_days,
                    'override_leave_days' => $item->override_leave_days,
                    'is_manual_adjusted' => $item->is_manual_adjusted,
                    'manual_adjustment_amount' => $item->manual_adjustment_amount,
                    'manual_adjustment_reason' => $item->manual_adjustment_reason,
                    'manual_adjusted_at' => $item->manual_adjusted_at,
                    'manual_adjusted_by' => $item->manualAdjustedBy ?
                        $item->manualAdjustedBy->first_name . ' ' . $item->manualAdjustedBy->last_name :
                        null,
                    'override_notes' => $item->override_notes,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching payroll item: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch payroll item',
            ], 500);
        }
    }

    /**
     * Apply manual adjustment to payroll item
     */
    public function adjust(Request $request, $id)
    {
        try {
            $item = PayrollItem::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'manual_adjustment_amount' => 'nullable|numeric',
                'manual_adjustment_reason' => 'required|string|min:5',
                'override_present_days' => 'nullable|integer|min:0',
                'override_absent_days' => 'nullable|integer|min:0',
                'override_leave_days' => 'nullable|integer|min:0',
                'override_notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Check if payroll is still editable (not paid)
            $payroll = $item->payrollPeriod;
            if (!$payroll) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Payroll period not found',
                ], 404);
            }

            if (in_array($payroll->status, ['paid', 'cancelled'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot adjust payroll that is already paid or cancelled',
                ], 400);
            }

            // Apply adjustment
            $data = $request->all();
            $data['manual_adjustment_amount'] = $data['manual_adjustment_amount'] ?? 0;

            $item->applyManualAdjustment($data);

            // Log adjustment
            Log::info('Payroll adjustment applied', [
                'payroll_item_id' => $item->id,
                'employee_id' => $item->employee_id,
                'adjusted_by' => auth()->id(),
                'adjustment_data' => $request->all(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Manual adjustment applied successfully',
                'data' => $item->load(['employee', 'payrollPeriod', 'manualAdjustedBy']),
            ]);
        } catch (\Exception $e) {
            Log::error('Error applying adjustment: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to apply adjustment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clear manual adjustment
     */
    public function clear($id)
    {
        try {
            $item = PayrollItem::findOrFail($id);

            // Check if payroll is still editable
            $payroll = $item->payrollPeriod;
            if (!$payroll) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Payroll period not found',
                ], 404);
            }

            if (in_array($payroll->status, ['paid', 'cancelled'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot clear adjustment for paid or cancelled payroll',
                ], 400);
            }

            if (!$item->is_manual_adjusted) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No manual adjustment to clear',
                ], 400);
            }

            $item->clearManualAdjustment();

            return response()->json([
                'status' => 'success',
                'message' => 'Manual adjustment cleared successfully',
                'data' => $item->load(['employee', 'payrollPeriod']),
            ]);
        } catch (\Exception $e) {
            Log::error('Error clearing adjustment: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to clear adjustment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get adjustment history for an employee
     */
    public function history($employeeId)
    {
        try {
            $items = PayrollItem::where('employee_id', $employeeId)
                ->where('is_manual_adjusted', true)
                ->with(['payrollPeriod', 'manualAdjustedBy'])
                ->orderBy('manual_adjusted_at', 'desc')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $items,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching adjustment history: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch adjustment history: ' . $e->getMessage(),
            ], 500);
        }
    }
}
