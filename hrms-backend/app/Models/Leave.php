<?php
// app/Models/Leave.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Leave extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'start_date',
        'end_date',
        'total_days',
        'reason',
        'attachment',
        'status',
        'approval_flow',
        'approval_level',
        'total_approval_levels',
        'rejection_reason',
        'cancelled_by',
        'cancelled_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'approval_flow' => 'array',
        'total_days' => 'float',
        'approval_level' => 'integer',
        'total_approval_levels' => 'integer',
        'cancelled_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'pending',
        'approval_level' => 0,
        'total_approval_levels' => 1,
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

    public function approvals()
    {
        return $this->hasMany(LeaveApproval::class)->orderBy('level');
    }

    public function cancelledBy()
    {
        return $this->belongsTo(Employee::class, 'cancelled_by');
    }

    public function auditLogs()
    {
        return $this->hasMany(LeaveAuditLog::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeByEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeByDateRange($query, $start, $end)
    {
        return $query->whereBetween('start_date', [$start, $end]);
    }

    // Helper Methods
    public function isPending()
    {
        return $this->status === 'pending';
    }

    public function isApproved()
    {
        return $this->status === 'approved';
    }

    public function isRejected()
    {
        return $this->status === 'rejected';
    }

    public function isCancelled()
    {
        return $this->status === 'cancelled';
    }

    public function isFullyApproved()
    {
        return $this->isApproved();
    }

    public function getCurrentApproval()
    {
        return $this->approvals()->where('status', 'pending')->first();
    }

    public function getNextApprover()
    {
        $current = $this->getCurrentApproval();
        return $current ? $current->approver : null;
    }

    public function getApprovalProgress()
    {
        if ($this->total_approval_levels === 0) {
            return 0;
        }
        return round(($this->approval_level / $this->total_approval_levels) * 100);
    }

    public function canCancel()
    {
        return $this->isPending() && !$this->isApproved();
    }

    public function getFormattedDuration()
    {
        $start = $this->start_date->format('d M Y');
        $end = $this->end_date->format('d M Y');
        return $start . ' → ' . $end;
    }
}