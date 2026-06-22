<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollPeriod;
use App\Models\PayrollItem;
use App\Models\TaxSetting;
use App\Models\EmployeeSalarySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PayrollController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = PayrollPeriod::with(['createdBy', 'approvedBy']);

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            if ($request->has('year')) {
                $query->whereYear('start_date', $request->year);
            }
            if ($request->has('month')) {
                $query->whereMonth('start_date', $request->month);
            }
            if ($request->has('search')) {
                $query->where('name', 'like', "%{$request->search}%");
            }

            $payrolls = $query->orderBy('start_date', 'desc')->paginate($request->per_page ?? 15);

            return response()->json([
                'status' => 'success',
                'data' => $payrolls,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching payrolls: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch payrolls',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'payment_date' => 'nullable|date',
                'employee_ids' => 'required|array',
                'employee_ids.*' => 'exists:employees,id',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            DB::beginTransaction();

            $payroll = PayrollPeriod::create([
                'name' => $request->name,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'payment_date' => $request->payment_date,
                'status' => 'draft',
                'notes' => $request->notes,
                'created_by' => auth()->id(),
            ]);

            // Create payroll items for each employee
            $taxSettings = TaxSetting::getActive();
            $totalEmployees = 0;
            $totalGross = 0;
            $totalDeductions = 0;
            $totalNet = 0;
            $totalTax = 0;

            foreach ($request->employee_ids as $employeeId) {
                $salarySetting = EmployeeSalarySetting::where('employee_id', $employeeId)->first();

                if (!$salarySetting) {
                    continue;
                }

                // Calculate earnings
                $basicSalary = $salarySetting->basic_salary;
                $allowance = $salarySetting->housing_allowance + $salarySetting->transport_allowance +
                    $salarySetting->meal_allowance + $salarySetting->phone_allowance +
                    $salarySetting->other_allowance;
                $totalEarnings = $basicSalary + $allowance;

                // Calculate tax (Cambodia tax system)
                $tax = 0;
                if ($taxSettings && !$salarySetting->is_tax_exempt) {
                    $tax = $taxSettings->calculateTax($totalEarnings, $salarySetting->dependents);
                }

                // Calculate NSSF
                $nssf = 0;
                if ($taxSettings) {
                    $nssf = $taxSettings->calculateNSSF($basicSalary)['employee'];
                }

                // Calculate total deductions
                $totalDeductionsEmployee = $tax + $nssf;

                // Calculate net pay
                $netPay = $totalEarnings - $totalDeductionsEmployee;

                $payrollItem = PayrollItem::create([
                    'payroll_period_id' => $payroll->id,
                    'employee_id' => $employeeId,
                    'basic_salary' => $basicSalary,
                    'allowance' => $allowance,
                    'overtime' => 0,
                    'bonus' => 0,
                    'commission' => 0,
                    'other_earnings' => 0,
                    'total_earnings' => $totalEarnings,
                    'tax' => $tax,
                    'social_security' => $nssf,
                    'health_insurance' => 0,
                    'loan' => 0,
                    'advance' => 0,
                    'other_deductions' => 0,
                    'total_deductions' => $totalDeductionsEmployee,
                    'net_pay' => $netPay,
                    'working_days' => 22,
                    'present_days' => 22,
                    'absent_days' => 0,
                    'leave_days' => 0,
                    'holiday_days' => 0,
                    'overtime_hours' => 0,
                    'currency' => 'KHR',
                    'exchange_rate' => 1,
                ]);

                $totalEmployees++;
                $totalGross += $totalEarnings;
                $totalDeductions += $totalDeductionsEmployee;
                $totalNet += $netPay;
                $totalTax += $tax;
            }

            // Update payroll totals
            $payroll->update([
                'total_employees' => $totalEmployees,
                'total_gross' => $totalGross,
                'total_deductions' => $totalDeductions,
                'total_net' => $totalNet,
                'total_tax' => $totalTax,
            ]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Payroll created successfully',
                'data' => $payroll->load(['items.employee']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating payroll: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create payroll: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $payroll = PayrollPeriod::with([
                'items.employee.position',
                'createdBy',
                'approvedBy'
            ])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $payroll,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Payroll not found',
            ], 404);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $payroll = PayrollPeriod::findOrFail($id);

            if ($payroll->status !== 'draft') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot update payroll that is not in draft status',
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|string|max:255',
                'start_date' => 'sometimes|date',
                'end_date' => 'sometimes|date|after:start_date',
                'payment_date' => 'nullable|date',
                'employee_ids' => 'sometimes|array',
                'employee_ids.*' => 'exists:employees,id',
                'notes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            DB::beginTransaction();

            // Update payroll period
            $payroll->update($request->only(['name', 'start_date', 'end_date', 'payment_date', 'notes']));

            // Update employees if provided
            if ($request->has('employee_ids')) {
                // Remove old items
                $payroll->items()->delete();

                // Create new items for each employee
                $taxSettings = TaxSetting::getActive();
                $totalEmployees = 0;
                $totalGross = 0;
                $totalDeductions = 0;
                $totalNet = 0;
                $totalTax = 0;

                foreach ($request->employee_ids as $employeeId) {
                    $salarySetting = EmployeeSalarySetting::where('employee_id', $employeeId)->first();

                    if (!$salarySetting) {
                        continue;
                    }

                    $basicSalary = $salarySetting->basic_salary;
                    $allowance = $salarySetting->housing_allowance + $salarySetting->transport_allowance +
                        $salarySetting->meal_allowance + $salarySetting->phone_allowance +
                        $salarySetting->other_allowance;
                    $totalEarnings = $basicSalary + $allowance;

                    $tax = 0;
                    if ($taxSettings && !$salarySetting->is_tax_exempt) {
                        $tax = $taxSettings->calculateTax($totalEarnings, $salarySetting->dependents);
                    }

                    $nssf = 0;
                    if ($taxSettings) {
                        $nssf = $taxSettings->calculateNSSF($basicSalary)['employee'];
                    }

                    $totalDeductionsEmployee = $tax + $nssf;
                    $netPay = $totalEarnings - $totalDeductionsEmployee;

                    PayrollItem::create([
                        'payroll_period_id' => $payroll->id,
                        'employee_id' => $employeeId,
                        'basic_salary' => $basicSalary,
                        'allowance' => $allowance,
                        'overtime' => 0,
                        'bonus' => 0,
                        'commission' => 0,
                        'other_earnings' => 0,
                        'total_earnings' => $totalEarnings,
                        'tax' => $tax,
                        'social_security' => $nssf,
                        'health_insurance' => 0,
                        'loan' => 0,
                        'advance' => 0,
                        'other_deductions' => 0,
                        'total_deductions' => $totalDeductionsEmployee,
                        'net_pay' => $netPay,
                        'working_days' => 22,
                        'present_days' => 22,
                        'absent_days' => 0,
                        'leave_days' => 0,
                        'holiday_days' => 0,
                        'overtime_hours' => 0,
                        'currency' => 'KHR',
                        'exchange_rate' => 1,
                    ]);

                    $totalEmployees++;
                    $totalGross += $totalEarnings;
                    $totalDeductions += $totalDeductionsEmployee;
                    $totalNet += $netPay;
                    $totalTax += $tax;
                }

                $payroll->update([
                    'total_employees' => $totalEmployees,
                    'total_gross' => $totalGross,
                    'total_deductions' => $totalDeductions,
                    'total_net' => $totalNet,
                    'total_tax' => $totalTax,
                ]);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Payroll updated successfully',
                'data' => $payroll->load(['items.employee']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating payroll: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update payroll: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        try {
            $payroll = PayrollPeriod::findOrFail($id);
            $newStatus = $request->status;

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:draft,processing,approved,paid,cancelled',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            // Validate status transitions
            $allowedTransitions = [
                'draft' => ['processing', 'cancelled'],
                'processing' => ['approved', 'cancelled'],
                'approved' => ['paid', 'cancelled'],
                'paid' => [],
                'cancelled' => [],
            ];

            if (!in_array($newStatus, $allowedTransitions[$payroll->status])) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Cannot transition from {$payroll->status} to {$newStatus}",
                ], 400);
            }

            $payroll->status = $newStatus;

            if ($newStatus === 'approved') {
                $payroll->approved_by = auth()->id();
                $payroll->approved_at = now();
            }

            $payroll->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Payroll status updated successfully',
                'data' => $payroll,
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating payroll status: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update status: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $payroll = PayrollPeriod::findOrFail($id);

            if ($payroll->status !== 'draft') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot delete payroll that is not in draft status',
                ], 400);
            }

            $payroll->items()->delete();
            $payroll->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Payroll deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting payroll: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete payroll: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function stats()
    {
        try {
            $stats = [
                'total' => PayrollPeriod::count(),
                'total_gross' => PayrollPeriod::sum('total_gross'),
                'total_net' => PayrollPeriod::sum('total_net'),
                'total_tax' => PayrollPeriod::sum('total_tax'),
                'by_status' => PayrollPeriod::select('status', DB::raw('count(*) as count'))
                    ->groupBy('status')
                    ->get(),
                'total_employees' => PayrollPeriod::sum('total_employees'),
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
