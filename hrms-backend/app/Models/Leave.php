<?php
// app/Models/Leave.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Leave extends Model
{
    use SoftDeletes;

    protected $table = 'leaves';

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'start_date',
        'end_date',
        'total_days',
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
        'start_date' => 'date',
        'end_date' => 'date',
        'total_days' => 'decimal:1',
        'cancelled_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function approvals()
    {
        return $this->hasMany(LeaveApproval::class)->orderBy('level');
    }

    public function cancelledBy()
    {
        return $this->belongsTo(Employee::class, 'cancelled_by');
    }

    /**
     * Get current pending approval
     */
    public function getCurrentPendingApprovalAttribute()
    {
        return $this->approvals()->where('status', 'pending')->first();
    }

    /**
     * Check if leave is fully approved
     */
    public function getIsFullyApprovedAttribute(): bool
    {
        return $this->status === 'approved' &&
            $this->approval_level >= $this->total_approval_levels;
    }

    /**
     * Check if leave is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if leave is approved
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if leave is rejected
     */
    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    /**
     * Check if leave is cancelled
     */
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Get next approval level
     */
    public function getNextApprovalLevelAttribute(): int
    {
        return $this->approval_level + 1;
    }

    /**
     * Get approval progress percentage
     */
    public function getApprovalProgressAttribute(): int
    {
        if ($this->total_approval_levels === 0) {
            return 0;
        }

        return round(($this->approval_level / $this->total_approval_levels) * 100);
    }
}
