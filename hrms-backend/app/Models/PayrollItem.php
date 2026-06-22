<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
        'notes',
        // ✅ Tambahan untuk prorata
        'is_prorated',
        'prorated_days',
        'actual_salary',
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
    ];

    public function payrollPeriod()
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function getCurrencySymbolAttribute()
    {
        return $this->currency === 'KHR' ? '៛' : '$';
    }

    public function getNetPayFormattedAttribute()
    {
        return number_format($this->net_pay, 2) . ' ' . $this->currency_symbol;
    }

    // ✅ Check if this is a full month or prorated
    public function getIsFullMonthAttribute()
    {
        return !$this->is_prorated;
    }

    // ✅ Get salary breakdown for display
    public function getSalaryBreakdownAttribute()
    {
        return [
            'basic_salary' => $this->basic_salary,
            'allowance' => $this->allowance,
            'overtime' => $this->overtime,
            'bonus' => $this->bonus,
            'commission' => $this->commission,
            'other_earnings' => $this->other_earnings,
            'total_earnings' => $this->total_earnings,
            'tax' => $this->tax,
            'social_security' => $this->social_security,
            'health_insurance' => $this->health_insurance,
            'loan' => $this->loan,
            'advance' => $this->advance,
            'other_deductions' => $this->other_deductions,
            'total_deductions' => $this->total_deductions,
            'net_pay' => $this->net_pay,
        ];
    }
}
