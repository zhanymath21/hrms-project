<?php
// app/Models/LeaveBalance.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'year',
        'base_entitlement',
        'seniority_bonus',
        'carry_forward',
        'replacement_days',
        'manual_adjustment',
        'total_entitlement',
        'used_days',
        'pending_days',
        'remaining_days',
        'adjustment_reason',
        'adjusted_by',
        'adjusted_at',
    ];

    protected $casts = [
        'base_entitlement' => 'float',
        'seniority_bonus' => 'float',
        'carry_forward' => 'float',
        'replacement_days' => 'float',
        'manual_adjustment' => 'float',
        'total_entitlement' => 'float',
        'used_days' => 'float',
        'pending_days' => 'float',
        'remaining_days' => 'float',
        'adjusted_at' => 'datetime',
        'year' => 'integer',
    ];

    protected $attributes = [
        'base_entitlement' => 0,
        'seniority_bonus' => 0,
        'carry_forward' => 0,
        'replacement_days' => 0,
        'manual_adjustment' => 0,
        'total_entitlement' => 0,
        'used_days' => 0,
        'pending_days' => 0,
        'remaining_days' => 0,
    ];

    // Relationships
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function adjustedBy()
    {
        return $this->belongsTo(Employee::class, 'adjusted_by');
    }

    // Scopes
    public function scopeForYear($query, $year)
    {
        return $query->where('year', $year);
    }

    public function scopeCurrentYear($query)
    {
        return $query->where('year', date('Y'));
    }

    // Helper Methods
    public function isSufficient($days)
    {
        return $this->remaining_days >= $days;
    }

    public function getUsedPercentage()
    {
        if ($this->total_entitlement == 0) {
            return 0;
        }
        return round(($this->used_days / $this->total_entitlement) * 100);
    }

    public function getRemainingPercentage()
    {
        if ($this->total_entitlement == 0) {
            return 0;
        }
        return round(($this->remaining_days / $this->total_entitlement) * 100);
    }

    public function isLow($threshold = 2)
    {
        return $this->remaining_days <= $threshold;
    }

    public function isExhausted()
    {
        return $this->remaining_days <= 0;
    }
}