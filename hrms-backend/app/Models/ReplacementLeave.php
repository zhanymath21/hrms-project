<?php
// app/Models/ReplacementLeave.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReplacementLeave extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id',
        'work_date',
        'work_day_type',
        'hours_worked',
        'replacement_date',
        'days_to_add',
        'reason',
        'attachment',
        'status',
        'approval_level',
        'total_approval_levels',
        'rejection_reason',
        'cancelled_by',
        'cancelled_at',
    ];

    protected $casts = [
        'work_date' => 'date',
        'replacement_date' => 'date',
        'days_to_add' => 'decimal:1',
        'cancelled_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approvals()
    {
        return $this->hasMany(ReplacementLeaveApproval::class)->orderBy('level');
    }

    public function cancelledBy()
    {
        return $this->belongsTo(Employee::class, 'cancelled_by');
    }
}
