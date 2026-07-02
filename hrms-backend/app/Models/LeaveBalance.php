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
        'base_entitlement' => 'decimal:1',
        'seniority_bonus' => 'decimal:1',
        'carry_forward' => 'decimal:1',
        'replacement_days' => 'decimal:1',
        'manual_adjustment' => 'decimal:1',
        'total_entitlement' => 'decimal:1',
        'used_days' => 'decimal:1',
        'pending_days' => 'decimal:1',
        'remaining_days' => 'decimal:1',
        'adjusted_at' => 'datetime',
    ];

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
}