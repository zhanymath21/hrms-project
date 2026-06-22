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
}
