<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeSalarySetting extends Model
{
    use HasFactory;

    protected $table = 'employee_salary_settings';

    protected $fillable = [
        'employee_id',
        'basic_salary',
        'housing_allowance',
        'transport_allowance',
        'meal_allowance',
        'phone_allowance',
        'other_allowance',
        'dependents',
        'is_tax_exempt',
        'payment_method',
        'bank_name',
        'bank_account_number',
        'bank_account_name',
        'currency',
        'working_days_per_month', // ✅ Tambahkan
        'working_days_type',       // ✅ Tambahkan
        'include_weekends',        // ✅ Tambahkan
    ];

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'housing_allowance' => 'decimal:2',
        'transport_allowance' => 'decimal:2',
        'meal_allowance' => 'decimal:2',
        'phone_allowance' => 'decimal:2',
        'other_allowance' => 'decimal:2',
        'dependents' => 'integer',
        'is_tax_exempt' => 'boolean',
        'working_days_per_month' => 'integer',
        'include_weekends' => 'boolean',
    ];

    // Relationships
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    // Accessors
    public function getTotalAllowanceAttribute()
    {
        return $this->housing_allowance +
            $this->transport_allowance +
            $this->meal_allowance +
            $this->phone_allowance +
            $this->other_allowance;
    }

    public function getTotalSalaryAttribute()
    {
        return $this->basic_salary + $this->total_allowance;
    }

    // Get salary breakdown
    public function getSalaryBreakdownAttribute()
    {
        return [
            'basic_salary' => $this->basic_salary,
            'housing_allowance' => $this->housing_allowance,
            'transport_allowance' => $this->transport_allowance,
            'meal_allowance' => $this->meal_allowance,
            'phone_allowance' => $this->phone_allowance,
            'other_allowance' => $this->other_allowance,
            'total_allowance' => $this->total_allowance,
            'total_salary' => $this->total_salary,
            'dependents' => $this->dependents,
            'is_tax_exempt' => $this->is_tax_exempt,
            'currency' => $this->currency,
        ];
    }

    public function getWorkingDaysForMonth($month, $year)
    {
        $date = \Carbon\Carbon::createFromDate($year, $month, 1);
        $daysInMonth = $date->daysInMonth;

        if ($this->include_weekends) {
            return $daysInMonth;
        }

        // Count weekdays (Mon-Fri)
        $workingDays = 0;
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $currentDate = \Carbon\Carbon::createFromDate($year, $month, $day);
            if ($currentDate->isWeekday()) {
                $workingDays++;
            }
        }

        return $workingDays;
    }

    // ✅ Get daily rate
    public function getDailyRate($month = null, $year = null)
    {
        $month = $month ?? now()->month;
        $year = $year ?? now()->year;

        $workingDays = $this->working_days_per_month ?? $this->getWorkingDaysForMonth($month, $year);

        return $workingDays > 0 ? $this->basic_salary / $workingDays : 0;
    }

    // ✅ Calculate prorated salary
    public function calculateProratedSalary($presentDays, $month = null, $year = null)
    {
        $dailyRate = $this->getDailyRate($month, $year);
        return $dailyRate * $presentDays;
    }

    // ✅ Get working days type label
    public function getWorkingDaysTypeLabelAttribute()
    {
        $labels = [
            'standard' => 'Standard (Mon-Fri)',
            'shift' => 'Shift Work',
            'flexible' => 'Flexible',
        ];
        return $labels[$this->working_days_type] ?? $this->working_days_type;
    }

    // ✅ Get formatted working days
    public function getFormattedWorkingDaysAttribute()
    {
        return "{$this->working_days_per_month} days/month";
    }
}
