<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class PayrollItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_period_id',
        'employee_id',
        'basic_salary',
        'allowance',
        'overtime',
        'bonus',
        'commission',
        'other_earnings',
        'total_earnings',
        'tax',
        'social_security',
        'health_insurance',
        'loan',
        'advance',
        'other_deductions',
        'total_deductions',
        'net_pay',
        'working_days',
        'present_days',
        'absent_days',
        'leave_days',
        'holiday_days',
        'overtime_hours',
        'currency',
        'exchange_rate',
        'is_prorated',
        'prorated_days',
        'actual_salary',
        'notes',
        // Adjustment fields
        'is_manual_adjusted',
        'manual_adjustment_amount',
        'manual_adjustment_reason',
        'manual_adjusted_at',
        'manual_adjusted_by',
        'override_present_days',
        'override_absent_days',
        'override_leave_days',
        'override_notes',
    ];

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'allowance' => 'decimal:2',
        'overtime' => 'decimal:2',
        'bonus' => 'decimal:2',
        'commission' => 'decimal:2',
        'other_earnings' => 'decimal:2',
        'total_earnings' => 'decimal:2',
        'tax' => 'decimal:2',
        'social_security' => 'decimal:2',
        'health_insurance' => 'decimal:2',
        'loan' => 'decimal:2',
        'advance' => 'decimal:2',
        'other_deductions' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'net_pay' => 'decimal:2',
        'exchange_rate' => 'decimal:2',
        'is_prorated' => 'boolean',
        'prorated_days' => 'integer',
        'actual_salary' => 'decimal:2',
        'is_manual_adjusted' => 'boolean',
        'manual_adjustment_amount' => 'decimal:2',
        'manual_adjusted_at' => 'datetime',
        'override_present_days' => 'integer',
        'override_absent_days' => 'integer',
        'override_leave_days' => 'integer',
        'working_days' => 'integer',
        'present_days' => 'integer',
        'absent_days' => 'integer',
        'leave_days' => 'integer',
        'holiday_days' => 'integer',
        'overtime_hours' => 'integer',
    ];

    // ============ RELATIONSHIPS ============

    public function payrollPeriod()
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function manualAdjustedBy()
    {
        return $this->belongsTo(Employee::class, 'manual_adjusted_by');
    }

    // ============ ACCESSORS ============

    public function getEffectivePresentDaysAttribute()
    {
        return $this->override_present_days ?? $this->present_days;
    }

    public function getEffectiveAbsentDaysAttribute()
    {
        return $this->override_absent_days ?? $this->absent_days;
    }

    public function getEffectiveLeaveDaysAttribute()
    {
        return $this->override_leave_days ?? $this->leave_days;
    }

    public function getHasManualAdjustmentAttribute()
    {
        return $this->is_manual_adjusted ||
            $this->manual_adjustment_amount != 0 ||
            $this->override_present_days !== null ||
            $this->override_absent_days !== null ||
            $this->override_leave_days !== null;
    }

    public function getCurrencySymbolAttribute()
    {
        return $this->currency === 'USD' ? '$' : '៛';
    }

    public function getFormattedBasicSalaryAttribute()
    {
        return $this->currency_symbol . number_format($this->basic_salary, 2);
    }

    public function getFormattedNetPayAttribute()
    {
        return $this->currency_symbol . number_format($this->net_pay, 2);
    }

    public function getFormattedManualAdjustmentAttribute()
    {
        return $this->currency_symbol . number_format($this->manual_adjustment_amount, 2);
    }

    // ============ METHODS ============

    // Update attendance data
    public function updateAttendance($startDate, $endDate)
    {
        $employee = $this->employee;

        // Get attendance records
        $attendances = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$startDate, $endDate])
            ->get();

        $presentDays = $attendances->where('status', 'present')->count();
        $absentDays = $attendances->where('status', 'absent')->count();
        $leaveDays = $attendances->where('status', 'leave')->count();
        $holidayDays = $attendances->where('status', 'holiday')->count();

        $workingDays = $this->calculateWorkingDays($startDate, $endDate);

        $this->update([
            'present_days' => $presentDays,
            'absent_days' => $absentDays,
            'leave_days' => $leaveDays,
            'holiday_days' => $holidayDays,
            'working_days' => $workingDays,
        ]);

        return $this;
    }

    // Update leave data
    public function updateLeave($startDate, $endDate)
    {
        $employee = $this->employee;

        $leaves = Leave::where('employee_id', $employee->id)
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

        $this->update([
            'leave_days' => $totalLeaveDays,
        ]);

        return $this;
    }

    // Calculate working days (Mon-Fri)
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

    // Calculate salary from attendance
    public function calculateSalaryFromAttendance()
    {
        $salarySetting = EmployeeSalarySetting::where('employee_id', $this->employee_id)->first();

        if (!$salarySetting) {
            return $this;
        }

        $presentDays = $this->effective_present_days;
        $leaveDays = $this->effective_leave_days;
        $workingDays = $this->working_days;

        // ✅ Get employee's monthly working days
        $monthlyWorkingDays = $salarySetting->working_days_per_month ?? 22;

        // ✅ Calculate daily rate based on monthly working days
        $dailyRate = $monthlyWorkingDays > 0 ? $salarySetting->basic_salary / $monthlyWorkingDays : 0;
        $actualSalary = $dailyRate * ($presentDays + $leaveDays);

        // Allowance calculation (prorated)
        $totalAllowance = $salarySetting->housing_allowance +
            $salarySetting->transport_allowance +
            $salarySetting->meal_allowance +
            $salarySetting->phone_allowance +
            $salarySetting->other_allowance;

        $dailyAllowance = $monthlyWorkingDays > 0 ? $totalAllowance / $monthlyWorkingDays : 0;
        $actualAllowance = $dailyAllowance * ($presentDays + $leaveDays);

        $totalEarnings = $actualSalary + $actualAllowance + $this->manual_adjustment_amount;

        // Calculate tax & NSSF
        $taxSettings = TaxSetting::getActive();
        $tax = 0;
        if ($taxSettings && !$salarySetting->is_tax_exempt) {
            $tax = $taxSettings->calculateTax($totalEarnings, $salarySetting->dependents);
        }

        $nssf = 0;
        if ($taxSettings) {
            $nssf = $taxSettings->calculateNSSF($actualSalary)['employee'];
        }

        $totalDeductions = $tax + $nssf;
        $netPay = $totalEarnings - $totalDeductions;

        $this->update([
            'basic_salary' => $actualSalary,
            'allowance' => $actualAllowance,
            'total_earnings' => $totalEarnings,
            'tax' => $tax,
            'social_security' => $nssf,
            'total_deductions' => $totalDeductions,
            'net_pay' => $netPay,
            'currency' => $this->currency ?? 'USD',
        ]);

        return $this;
    }
    // Apply manual adjustment
    public function applyManualAdjustment($data)
    {
        $this->is_manual_adjusted = true;
        $this->manual_adjusted_at = now();
        $this->manual_adjusted_by = auth()->id();

        if (isset($data['manual_adjustment_amount'])) {
            $this->manual_adjustment_amount = $data['manual_adjustment_amount'];
        }

        if (isset($data['manual_adjustment_reason'])) {
            $this->manual_adjustment_reason = $data['manual_adjustment_reason'];
        }

        if (isset($data['override_present_days'])) {
            $this->override_present_days = $data['override_present_days'];
        }

        if (isset($data['override_absent_days'])) {
            $this->override_absent_days = $data['override_absent_days'];
        }

        if (isset($data['override_leave_days'])) {
            $this->override_leave_days = $data['override_leave_days'];
        }

        if (isset($data['override_notes'])) {
            $this->override_notes = $data['override_notes'];
        }

        $this->calculateSalaryFromAttendance();
        $this->save();

        return $this;
    }

    // Clear manual adjustment
    public function clearManualAdjustment()
    {
        $this->is_manual_adjusted = false;
        $this->manual_adjustment_amount = 0;
        $this->manual_adjustment_reason = null;
        $this->manual_adjusted_at = null;
        $this->manual_adjusted_by = null;
        $this->override_present_days = null;
        $this->override_absent_days = null;
        $this->override_leave_days = null;
        $this->override_notes = null;
        $this->save();

        $this->calculateSalaryFromAttendance();
        $this->save();

        return $this;
    }

    // app/Models/PayrollItem.php

    // ✅ Tambahkan accessor untuk adjustment details
    public function getAdjustmentDetailsAttribute()
    {
        if (!$this->is_manual_adjusted) {
            return null;
        }

        return [
            'amount' => $this->manual_adjustment_amount,
            'reason' => $this->manual_adjustment_reason,
            'adjusted_at' => $this->manual_adjusted_at,
            'adjusted_by' => $this->manualAdjustedBy ?
                $this->manualAdjustedBy->first_name . ' ' . $this->manualAdjustedBy->last_name :
                'System',
            'override_present_days' => $this->override_present_days,
            'override_absent_days' => $this->override_absent_days,
            'override_leave_days' => $this->override_leave_days,
            'notes' => $this->override_notes,
        ];
    }

    // ✅ Get adjustment display text
    public function getAdjustmentDisplayAttribute()
    {
        if (!$this->is_manual_adjusted) {
            return null;
        }

        $parts = [];
        if ($this->manual_adjustment_amount != 0) {
            $parts[] = ($this->manual_adjustment_amount > 0 ? '+' : '') .
                number_format($this->manual_adjustment_amount, 2);
        }
        if ($this->override_present_days !== null) {
            $parts[] = "Present: {$this->override_present_days} (was {$this->present_days})";
        }
        if ($this->override_absent_days !== null) {
            $parts[] = "Absent: {$this->override_absent_days} (was {$this->absent_days})";
        }
        if ($this->override_leave_days !== null) {
            $parts[] = "Leave: {$this->override_leave_days} (was {$this->leave_days})";
        }

        return implode(' | ', $parts);
    }
}
