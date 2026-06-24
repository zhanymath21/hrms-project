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
        'adjustment_amount',
        'adjustment_reason',
        'is_adjusted',
    ];

    // ✅ Tambahkan default values
    protected $attributes = [
        'basic_salary' => 0,
        'housing_allowance' => 0,
        'transport_allowance' => 0,
        'meal_allowance' => 0,
        'phone_allowance' => 0,
        'other_allowance' => 0,
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
        'working_days' => 0,
        'present_days' => 0,
        'absent_days' => 0,
        'leave_days' => 0,
        'holiday_days' => 0,
        'overtime_hours' => 0,
        'currency' => 'USD',
        'status' => 'draft',
        'adjustment_amount' => 'decimal:2',
        'is_adjusted' => 'boolean',
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

    // app/Models/Payslip.php

    // Tambahkan method untuk konversi
    public function getNetPayInUsdAttribute()
    {
        if ($this->currency === 'USD') {
            return $this->net_pay;
        }
        return ExchangeRate::convert($this->net_pay, 'KHR', 'USD');
    }

    public function getNetPayInKhrAttribute()
    {
        if ($this->currency === 'KHR') {
            return $this->net_pay;
        }
        return ExchangeRate::convert($this->net_pay, 'USD', 'KHR');
    }

    public function getFormattedNetPayAttribute()
    {
        return ExchangeRate::format($this->net_pay, $this->currency);
    }

    public function getFormattedNetPayUsdAttribute()
    {
        return ExchangeRate::format($this->net_pay_usd, 'USD');
    }

    public function getFormattedNetPayKhrAttribute()
    {
        return ExchangeRate::format($this->net_pay_khr, 'KHR');
    }

    public function getAdjustmentDisplayAttribute()
    {
        if (!$this->is_adjusted) {
            return null;
        }

        $parts = [];
        if ($this->adjustment_amount != 0) {
            $parts[] = ($this->adjustment_amount > 0 ? '+' : '') .
                number_format($this->adjustment_amount, 2);
        }
        if ($this->adjustment_reason) {
            $parts[] = $this->adjustment_reason;
        }

        return implode(' - ', $parts);
    }
}
