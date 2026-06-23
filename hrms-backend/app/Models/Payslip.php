<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payslip extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_period_id',
        'employee_id',
        'payroll_item_id',
        'employee_name',
        'employee_code',
        'position',
        'department',
        'period_start',
        'period_end',
        'payment_date',
        'basic_salary',
        'housing_allowance',
        'transport_allowance',
        'meal_allowance',
        'phone_allowance',
        'other_allowance',
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
        'status',
        'pdf_path',
        'notes',
    ];

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'housing_allowance' => 'decimal:2',
        'transport_allowance' => 'decimal:2',
        'meal_allowance' => 'decimal:2',
        'phone_allowance' => 'decimal:2',
        'other_allowance' => 'decimal:2',
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
        'period_start' => 'date',
        'period_end' => 'date',
        'payment_date' => 'date',
        'working_days' => 'integer',
        'present_days' => 'integer',
        'absent_days' => 'integer',
        'leave_days' => 'integer',
        'holiday_days' => 'integer',
        'overtime_hours' => 'integer',
    ];

    public function payrollPeriod()
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function payrollItem()
    {
        return $this->belongsTo(PayrollItem::class);
    }

    public function getStatusLabelAttribute()
    {
        $labels = [
            'draft' => 'Draft',
            'generated' => 'Generated',
            'sent' => 'Sent',
            'printed' => 'Printed',
        ];
        return $labels[$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        $colors = [
            'draft' => '#6b7280',
            'generated' => '#3b82f6',
            'sent' => '#10b981',
            'printed' => '#8b5cf6',
        ];
        return $colors[$this->status] ?? '#6b7280';
    }

    public function getCurrencySymbolAttribute()
    {
        return $this->currency === 'KHR' ? '៛' : '$';
    }

    public function getNetPayFormattedAttribute()
    {
        return number_format($this->net_pay, 2) . ' ' . $this->currency_symbol;
    }
}
