<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\PayrollPeriod;
use App\Models\PayrollItem;
use App\Models\TaxSetting;
use App\Models\EmployeeSalarySetting;
use App\Models\Leave;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PayrollController extends Controller
{
    // ============ LIST ALL PAYROLLS ============
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
            if ($request->has('currency')) {
                $query->where('currency', $request->currency);
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

    // ============ CREATE PAYROLL ============
    public function store(Request $request)
    {
        try {
            // ============================================
            // 1. VALIDATION
            // ============================================
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'payment_date' => 'nullable|date',
                'payroll_type' => 'required|in:monthly,semi_monthly,weekly',
                'payroll_cycle' => 'required|in:first,second,third,fourth',
                'currency' => 'nullable|string|in:USD,KHR',
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

            // ============================================
            // 2. BEGIN TRANSACTION
            // ============================================
            DB::beginTransaction();

            $currency = $request->currency ?? 'USD';
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);

            // ============================================
            // 3. CREATE PAYROLL PERIOD
            // ============================================
            $payroll = PayrollPeriod::create([
                'name' => $request->name,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'payment_date' => $request->payment_date ? Carbon::parse($request->payment_date) : null,
                'payroll_type' => $request->payroll_type,
                'payroll_cycle' => $request->payroll_cycle,
                'currency' => $currency,
                'status' => 'draft',
                'notes' => $request->notes,
                'created_by' => auth()->id(),
            ]);

            // ============================================
            // 4. GET TAX SETTINGS
            // ============================================
            $taxSettings = TaxSetting::getActive();

            // ============================================
            // 5. VARIABLES FOR TOTALS
            // ============================================
            $totalEmployees = 0;
            $totalGross = 0;
            $totalDeductions = 0;
            $totalNet = 0;
            $totalTax = 0;

            // ============================================
            // 6. PROCESS EACH EMPLOYEE
            // ============================================
            foreach ($request->employee_ids as $employeeId) {
                // 6a. Get Salary Settings
                $salarySetting = EmployeeSalarySetting::where('employee_id', $employeeId)->first();

                if (!$salarySetting) {
                    Log::warning("No salary setting found for employee ID: {$employeeId}");
                    continue;
                }

                // 6b. Get Employee Working Days
                $monthlyWorkingDays = $salarySetting->working_days_per_month ?? 22;

                // 6c. Calculate Working Days for Period
                $totalWorkingDays = $this->calculateWorkingDaysForPeriod(
                    $salarySetting,
                    $startDate,
                    $endDate
                );

                // 6d. Check Prorated Status
                $isProrated = false;
                $proratedDays = $totalWorkingDays;
                $actualSalary = $salarySetting->basic_salary;

                $joinDate = $salarySetting->employee->join_date ?? null;
                $leaveDate = $salarySetting->employee->leave_date ?? null;

                if ($joinDate && Carbon::parse($joinDate) > $startDate) {
                    $proratedDays = $this->calculateWorkingDaysForPeriod(
                        $salarySetting,
                        Carbon::parse($joinDate),
                        $endDate
                    );
                    $isProrated = true;
                } elseif ($leaveDate && Carbon::parse($leaveDate) < $endDate) {
                    $proratedDays = $this->calculateWorkingDaysForPeriod(
                        $salarySetting,
                        $startDate,
                        Carbon::parse($leaveDate)
                    );
                    $isProrated = true;
                }

                if ($isProrated) {
                    $dailyRate = $monthlyWorkingDays > 0 ? $salarySetting->basic_salary / $monthlyWorkingDays : 0;
                    $actualSalary = $dailyRate * $proratedDays;
                }

                // 6e. Calculate Allowance
                $totalAllowance = $salarySetting->housing_allowance +
                    $salarySetting->transport_allowance +
                    $salarySetting->meal_allowance +
                    $salarySetting->phone_allowance +
                    $salarySetting->other_allowance;

                $dailyAllowance = $monthlyWorkingDays > 0 ? $totalAllowance / $monthlyWorkingDays : 0;
                $actualAllowance = $dailyAllowance * ($isProrated ? $proratedDays : $totalWorkingDays);

                // 6f. Create Payroll Item
                $payrollItem = PayrollItem::create([
                    'payroll_period_id' => $payroll->id,
                    'employee_id' => $employeeId,
                    'basic_salary' => 0,
                    'allowance' => 0,
                    'overtime' => 0,
                    'bonus' => 0,
                    'commission' => 0,
                    'other_earnings' => 0,
                    'total_earnings' => 0,
                    'tax' => 0,
                    'social_security' => 0,
                    'health_insurance' => 0,
                    'loan' => 0,
                    'advance' => 0,
                    'other_deductions' => 0,
                    'total_deductions' => 0,
                    'net_pay' => 0,
                    'working_days' => $totalWorkingDays,
                    'present_days' => 0,
                    'absent_days' => 0,
                    'leave_days' => 0,
                    'holiday_days' => 0,
                    'overtime_hours' => 0,
                    'currency' => $currency,
                    'exchange_rate' => 1,
                    'is_prorated' => $isProrated,
                    'prorated_days' => $proratedDays,
                    'actual_salary' => $actualSalary,
                ]);

                // 6g. Update Attendance Data
                $this->updateAttendanceForPayrollItem($payrollItem, $startDate, $endDate);

                // 6h. Update Leave Data
                $this->updateLeaveForPayrollItem($payrollItem, $startDate, $endDate);

                // 6i. Calculate Salary from Attendance
                $this->calculateSalaryFromAttendance($payrollItem, $salarySetting, $monthlyWorkingDays);

                // 6j. Calculate Tax and Deductions
                $this->calculateTaxAndDeductions($payrollItem, $salarySetting, $taxSettings);

                // 6k. Update Totals
                $totalEmployees++;
                $totalGross += $payrollItem->total_earnings;
                $totalDeductions += $payrollItem->total_deductions;
                $totalNet += $payrollItem->net_pay;
                $totalTax += $payrollItem->tax;
            }

            // ============================================
            // 7. UPDATE PAYROLL TOTALS
            // ============================================
            $payroll->update([
                'total_employees' => $totalEmployees,
                'total_gross' => $totalGross,
                'total_deductions' => $totalDeductions,
                'total_net' => $totalNet,
                'total_tax' => $totalTax,
            ]);

            // ============================================
            // 8. COMMIT TRANSACTION
            // ============================================
            DB::commit();

            // ============================================
            // 9. RETURN RESPONSE
            // ============================================
            return response()->json([
                'status' => 'success',
                'message' => 'Payroll created successfully',
                'data' => $payroll->load(['items.employee', 'items.employee.position']),
            ], 201);
        } catch (\Exception $e) {
            // ============================================
            // 10. ROLLBACK ON ERROR
            // ============================================
            DB::rollBack();
            Log::error('Error creating payroll: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create payroll: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Calculate working days for a period based on employee settings
     */
    private function calculateWorkingDaysForPeriod($salarySetting, $startDate, $endDate)
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        // If employee has custom working days per month
        if ($salarySetting->working_days_per_month) {
            $daysInMonth = $start->daysInMonth;
            $workingDaysPerMonth = $salarySetting->working_days_per_month;
            $ratio = $workingDaysPerMonth / $daysInMonth;

            // Count actual days in period
            $totalDays = $start->diffInDays($end) + 1;

            // Apply ratio to get working days
            $workingDays = round($totalDays * $ratio);

            return max(1, $workingDays);
        }

        // Default: count weekdays (Mon-Fri)
        $workingDays = 0;
        for ($date = $start->copy(); $date <= $end; $date->addDay()) {
            if ($date->isWeekday()) {
                $workingDays++;
            }
        }

        return $workingDays;
    }

    /**
     * Update attendance for payroll item
     */
    private function updateAttendanceForPayrollItem($payrollItem, $startDate, $endDate)
    {
        $attendances = Attendance::where('employee_id', $payrollItem->employee_id)
            ->whereBetween('date', [$startDate, $endDate])
            ->get();

        $presentDays = $attendances->where('status', 'present')->count();
        $absentDays = $attendances->where('status', 'absent')->count();
        $leaveDays = $attendances->where('status', 'leave')->count();
        $holidayDays = $attendances->where('status', 'holiday')->count();
        $lateDays = $attendances->where('status', 'late')->count();
        $halfDay = $attendances->where('status', 'half_day')->count();

        $payrollItem->update([
            'present_days' => $presentDays,
            'absent_days' => $absentDays,
            'leave_days' => $leaveDays,
            'holiday_days' => $holidayDays,
        ]);

        return $payrollItem;
    }

    /**
     * Update leave for payroll item
     */
    private function updateLeaveForPayrollItem($payrollItem, $startDate, $endDate)
    {
        $leaves = Leave::where('employee_id', $payrollItem->employee_id)
            ->where('status', 'approved')
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('start_date', [$startDate, $endDate])
                    ->orWhereBetween('end_date', [$startDate, $endDate]);
            })
            ->get();

        $totalLeaveDays = 0;
        foreach ($leaves as $leave) {
            $start = max($leave->start_date, $startDate);
            $end = min($leave->end_date, $endDate);
            $days = Carbon::parse($start)->diffInWeekdays(Carbon::parse($end)) + 1;
            $totalLeaveDays += $days;
        }

        $payrollItem->update([
            'leave_days' => $totalLeaveDays,
        ]);

        return $payrollItem;
    }

    /**
     * Calculate salary from attendance
     */
    private function calculateSalaryFromAttendance($payrollItem, $salarySetting, $monthlyWorkingDays)
    {
        // Use effective days (with overrides)
        $presentDays = $payrollItem->effective_present_days;
        $leaveDays = $payrollItem->effective_leave_days;

        // Calculate daily rate
        $dailyRate = $monthlyWorkingDays > 0 ? $salarySetting->basic_salary / $monthlyWorkingDays : 0;
        $actualSalary = $dailyRate * ($presentDays + $leaveDays);

        // Calculate allowance
        $totalAllowance = $salarySetting->housing_allowance +
            $salarySetting->transport_allowance +
            $salarySetting->meal_allowance +
            $salarySetting->phone_allowance +
            $salarySetting->other_allowance;

        $dailyAllowance = $monthlyWorkingDays > 0 ? $totalAllowance / $monthlyWorkingDays : 0;
        $actualAllowance = $dailyAllowance * ($presentDays + $leaveDays);

        // Total earnings with manual adjustment
        $totalEarnings = $actualSalary + $actualAllowance + $payrollItem->manual_adjustment_amount;

        $payrollItem->update([
            'basic_salary' => $actualSalary,
            'allowance' => $actualAllowance,
            'total_earnings' => $totalEarnings,
        ]);

        return $payrollItem;
    }

    /**
     * Calculate tax and deductions
     */
    private function calculateTaxAndDeductions($payrollItem, $salarySetting, $taxSettings)
    {
        $totalEarnings = $payrollItem->total_earnings;

        // Calculate tax
        $tax = 0;
        if ($taxSettings && !$salarySetting->is_tax_exempt) {
            $tax = $taxSettings->calculateTax($totalEarnings, $salarySetting->dependents);
        }

        // Calculate NSSF
        $nssf = 0;
        if ($taxSettings) {
            $nssfCalculation = $taxSettings->calculateNSSF($payrollItem->basic_salary);
            $nssf = $nssfCalculation['employee'] ?? 0;
        }

        // Calculate total deductions
        $totalDeductions = $tax + $nssf;
        $netPay = $totalEarnings - $totalDeductions;

        $payrollItem->update([
            'tax' => $tax,
            'social_security' => $nssf,
            'health_insurance' => 0,
            'loan' => 0,
            'advance' => 0,
            'other_deductions' => 0,
            'total_deductions' => $totalDeductions,
            'net_pay' => $netPay,
        ]);

        return $payrollItem;
    }
    // app/Http/Controllers/Api/PayrollController.php - show method

    public function show($id)
    {
        try {
            $payroll = PayrollPeriod::with([
                'items.employee.position',
                'items.employee.department',
                'items.manualAdjustedBy',
                'createdBy',
                'approvedBy'
            ])->findOrFail($id);

            // ✅ Add adjustment details to each item
            $payroll->items->each(function ($item) {
                $item->adjustment_details = $item->adjustment_details;
                $item->adjustment_display = $item->adjustment_display;
            });

            return response()->json([
                'status' => 'success',
                'data' => $payroll,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching payroll: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Payroll not found',
            ], 404);
        }
    }

    // ============ UPDATE PAYROLL ============
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
                'currency' => 'nullable|string|in:USD,KHR',
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

            $payroll->update($request->only(['name', 'start_date', 'end_date', 'payment_date', 'currency', 'notes']));

            if ($request->has('employee_ids')) {
                $payroll->items()->delete();

                $currency = $payroll->currency ?? 'USD';
                $totalDays = $this->calculateWorkingDays($payroll->start_date, $payroll->end_date);
                $totalDaysInMonth = Carbon::parse($payroll->start_date)->daysInMonth;

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

                    $isProrated = false;
                    $proratedDays = $totalDays;
                    $actualSalary = $salarySetting->basic_salary;

                    $joinDate = $salarySetting->employee->join_date ?? null;
                    $leaveDate = $salarySetting->employee->leave_date ?? null;

                    if ($joinDate && $joinDate > $payroll->start_date) {
                        $proratedDays = $this->calculateWorkingDays($joinDate, $payroll->end_date);
                        $isProrated = true;
                    } elseif ($leaveDate && $leaveDate < $payroll->end_date) {
                        $proratedDays = $this->calculateWorkingDays($payroll->start_date, $leaveDate);
                        $isProrated = true;
                    }

                    if ($isProrated) {
                        $dailyRate = $salarySetting->basic_salary / $totalDaysInMonth;
                        $actualSalary = $dailyRate * $proratedDays;
                    }

                    $payrollItem = PayrollItem::create([
                        'payroll_period_id' => $payroll->id,
                        'employee_id' => $employeeId,
                        'basic_salary' => 0,
                        'allowance' => 0,
                        'overtime' => 0,
                        'bonus' => 0,
                        'commission' => 0,
                        'other_earnings' => 0,
                        'total_earnings' => 0,
                        'tax' => 0,
                        'social_security' => 0,
                        'health_insurance' => 0,
                        'loan' => 0,
                        'advance' => 0,
                        'other_deductions' => 0,
                        'total_deductions' => 0,
                        'net_pay' => 0,
                        'working_days' => $totalDays,
                        'present_days' => 0,
                        'absent_days' => 0,
                        'leave_days' => 0,
                        'holiday_days' => 0,
                        'overtime_hours' => 0,
                        'currency' => $currency,
                        'exchange_rate' => 1,
                        'is_prorated' => $isProrated,
                        'prorated_days' => $proratedDays,
                        'actual_salary' => $actualSalary,
                    ]);

                    $payrollItem->updateAttendance($payroll->start_date, $payroll->end_date);
                    $payrollItem->updateLeave($payroll->start_date, $payroll->end_date);
                    $payrollItem->calculateSalaryFromAttendance();

                    $totalEmployees++;
                    $totalGross += $payrollItem->total_earnings;
                    $totalDeductions += $payrollItem->total_deductions;
                    $totalNet += $payrollItem->net_pay;
                    $totalTax += $payrollItem->tax;
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

    // ============ UPDATE STATUS ============
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

    // ============ DELETE PAYROLL ============
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

    // ============ STATISTICS ============
    public function stats()
    {
        try {
            $stats = [
                'total' => PayrollPeriod::count(),
                'total_gross' => PayrollPeriod::sum('total_gross'),
                'total_net' => PayrollPeriod::sum('total_net'),
                'total_tax' => PayrollPeriod::sum('total_tax'),
                'total_employees' => PayrollPeriod::sum('total_employees'),
                'by_status' => PayrollPeriod::select('status', DB::raw('count(*) as count'))
                    ->groupBy('status')
                    ->get(),
                'by_currency' => PayrollPeriod::select('currency', DB::raw('count(*) as count'))
                    ->groupBy('currency')
                    ->get(),
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

    // ============ HELPERS ============

    private function calculateWorkingDays($startDate, $endDate)
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        $workingDays = 0;
        for ($date = $start->copy(); $date <= $end; $date->addDay()) {
            if ($date->isWeekday()) {
                $workingDays++;
            }
        }
        return $workingDays;
    }
}
