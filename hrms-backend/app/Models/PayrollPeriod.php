<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PayrollPeriod extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'payment_date',
        'payroll_type',
        'payroll_cycle',
        'cycle_number',
        'status',
        'total_gross',
        'total_deductions',
        'total_net',
        'total_tax',
        'total_employees',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'payment_date' => 'date',
        'approved_at' => 'datetime',
        'total_gross' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'total_net' => 'decimal:2',
        'total_tax' => 'decimal:2',
    ];

    const STATUS_DRAFT = 'draft';
    const STATUS_PROCESSING = 'processing';
    const STATUS_APPROVED = 'approved';
    const STATUS_PAID = 'paid';
    const STATUS_CANCELLED = 'cancelled';

    const TYPE_MONTHLY = 'monthly';
    const TYPE_SEMI_MONTHLY = 'semi_monthly';
    const TYPE_WEEKLY = 'weekly';

    const CYCLE_FIRST = 'first';
    const CYCLE_SECOND = 'second';
    const CYCLE_THIRD = 'third';
    const CYCLE_FOURTH = 'fourth';

    // ✅ Get type label
    public function getTypeLabelAttribute()
    {
        $labels = [
            self::TYPE_MONTHLY => 'Monthly',
            self::TYPE_SEMI_MONTHLY => 'Semi-Monthly',
            self::TYPE_WEEKLY => 'Weekly',
        ];
        return $labels[$this->payroll_type] ?? $this->payroll_type;
    }

    // ✅ Get cycle label
    public function getCycleLabelAttribute()
    {
        $labels = [
            self::CYCLE_FIRST => 'First Cycle',
            self::CYCLE_SECOND => 'Second Cycle',
            self::CYCLE_THIRD => 'Third Cycle',
            self::CYCLE_FOURTH => 'Fourth Cycle',
        ];
        return $labels[$this->payroll_cycle] ?? $this->payroll_cycle;
    }

    // ✅ Get period label for display
    public function getPeriodLabelAttribute()
    {
        $month = $this->start_date->format('F Y');
        if ($this->payroll_type === self::TYPE_SEMI_MONTHLY) {
            $day = $this->start_date->format('d');
            if ($day <= 15) {
                return "1st Half - {$month}";
            } else {
                return "2nd Half - {$month}";
            }
        }
        return $month;
    }

    public function items()
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(Employee::class, 'created_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(Employee::class, 'approved_by');
    }

    public function getStatusLabelAttribute()
    {
        $labels = [
            self::STATUS_DRAFT => 'Draft',
            self::STATUS_PROCESSING => 'Processing',
            self::STATUS_APPROVED => 'Approved',
            self::STATUS_PAID => 'Paid',
            self::STATUS_CANCELLED => 'Cancelled',
        ];
        return $labels[$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        $colors = [
            self::STATUS_DRAFT => '#6b7280',
            self::STATUS_PROCESSING => '#3b82f6',
            self::STATUS_APPROVED => '#10b981',
            self::STATUS_PAID => '#8b5cf6',
            self::STATUS_CANCELLED => '#ef4444',
        ];
        return $colors[$this->status] ?? '#6b7280';
    }
}
