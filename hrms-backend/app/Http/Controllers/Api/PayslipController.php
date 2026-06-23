<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payslip;
use App\Models\PayrollPeriod;
use App\Models\PayrollItem;
use App\Models\EmployeeSalarySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Validator;

class PayslipController extends Controller
{
    /**
     * Generate payslips for a payroll period
     */
    public function generate($payrollPeriodId)
    {
        try {
            DB::beginTransaction();

            $payroll = PayrollPeriod::with(['items.employee'])->findOrFail($payrollPeriodId);

            // Delete existing payslips
            Payslip::where('payroll_period_id', $payrollPeriodId)->delete();

            $payslips = [];

            foreach ($payroll->items as $item) {
                $employee = $item->employee;
                $salarySetting = EmployeeSalarySetting::where('employee_id', $employee->id)->first();

                // Get allowance breakdown
                $housingAllowance = $salarySetting->housing_allowance ?? 0;
                $transportAllowance = $salarySetting->transport_allowance ?? 0;
                $mealAllowance = $salarySetting->meal_allowance ?? 0;
                $phoneAllowance = $salarySetting->phone_allowance ?? 0;
                $otherAllowance = $salarySetting->other_allowance ?? 0;

                $payslip = Payslip::create([
                    'payroll_period_id' => $payrollPeriodId,
                    'employee_id' => $employee->id,
                    'payroll_item_id' => $item->id,
                    'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                    'employee_code' => $employee->employee_code ?? null,
                    'position' => $employee->position->title ?? null,
                    'department' => $employee->department->name ?? null,
                    'period_start' => $payroll->start_date,
                    'period_end' => $payroll->end_date,
                    'payment_date' => $payroll->payment_date,

                    // Earnings
                    'basic_salary' => $item->basic_salary,
                    'housing_allowance' => $housingAllowance,
                    'transport_allowance' => $transportAllowance,
                    'meal_allowance' => $mealAllowance,
                    'phone_allowance' => $phoneAllowance,
                    'other_allowance' => $otherAllowance,
                    'overtime' => $item->overtime,
                    'bonus' => $item->bonus,
                    'commission' => $item->commission,
                    'other_earnings' => $item->other_earnings,
                    'total_earnings' => $item->total_earnings,

                    // Deductions
                    'tax' => $item->tax,
                    'social_security' => $item->social_security,
                    'health_insurance' => $item->health_insurance,
                    'loan' => $item->loan,
                    'advance' => $item->advance,
                    'other_deductions' => $item->other_deductions,
                    'total_deductions' => $item->total_deductions,

                    // Net Pay
                    'net_pay' => $item->net_pay,

                    // Working Days
                    'working_days' => $item->working_days,
                    'present_days' => $item->present_days,
                    'absent_days' => $item->absent_days,
                    'leave_days' => $item->leave_days,
                    'holiday_days' => $item->holiday_days,
                    'overtime_hours' => $item->overtime_hours,

                    'currency' => $item->currency,
                    'status' => 'generated',
                    'notes' => 'Payslip generated from payroll',
                ]);

                $payslips[] = $payslip;
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Payslips generated successfully',
                'data' => [
                    'total' => count($payslips),
                    'payslips' => $payslips,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error generating payslips: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate payslips: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get payslips for a payroll period
     */
    public function index(Request $request)
    {
        try {
            $query = Payslip::with(['employee', 'payrollPeriod']);

            if ($request->has('payroll_period_id')) {
                $query->where('payroll_period_id', $request->payroll_period_id);
            }
            if ($request->has('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $payslips = $query->paginate($request->per_page ?? 15);

            return response()->json([
                'status' => 'success',
                'data' => $payslips,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching payslips: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch payslips',
            ], 500);
        }
    }

    /**
     * Get single payslip
     */
    public function show($id)
    {
        try {
            $payslip = Payslip::with(['employee', 'payrollPeriod'])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $payslip,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching payslip: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Payslip not found',
            ], 404);
        }
    }

    /**
     * Update payslip status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $payslip = Payslip::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:draft,generated,sent,printed',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $payslip->status = $request->status;
            $payslip->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Payslip status updated successfully',
                'data' => $payslip,
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating payslip status: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update payslip status',
            ], 500);
        }
    }

    /**
     * Delete payslip
     */
    public function destroy($id)
    {
        try {
            $payslip = Payslip::findOrFail($id);
            $payslip->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Payslip deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting payslip: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete payslip',
            ], 500);
        }
    }

    /**
     * Get payslip summary for an employee
     */
    public function employeeSummary($employeeId)
    {
        try {
            $payslips = Payslip::where('employee_id', $employeeId)
                ->orderBy('period_start', 'desc')
                ->get();

            $summary = [
                'total_payslips' => $payslips->count(),
                'total_earnings' => $payslips->sum('total_earnings'),
                'total_deductions' => $payslips->sum('total_deductions'),
                'total_net_pay' => $payslips->sum('net_pay'),
                'average_net_pay' => $payslips->avg('net_pay') ?? 0,
                'latest_payslip' => $payslips->first(),
                'payslips' => $payslips,
            ];

            return response()->json([
                'status' => 'success',
                'data' => $summary,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching employee payslip summary: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch payslip summary',
            ], 500);
        }
    }
}
