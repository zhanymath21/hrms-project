<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    protected $table = 'leave_balances';

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'year',
        'base_entitlement',
        'seniority_bonus',
        'carry_forward',
        'replacement_days',
        'manual_adjustment',
        'adjustment_reason',
        'adjusted_by',
        'adjusted_at',
        'total_entitlement',
        'used_days',
        'pending_days',
        'remaining_days',
    ];

    protected $casts = [
        'base_entitlement' => 'decimal:2',
        'seniority_bonus' => 'decimal:2',
        'carry_forward' => 'decimal:2',
        'replacement_days' => 'decimal:2',
        'manual_adjustment' => 'decimal:2',
        'total_entitlement' => 'decimal:2',
        'used_days' => 'decimal:2',
        'pending_days' => 'decimal:2',
        'remaining_days' => 'decimal:2',
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
