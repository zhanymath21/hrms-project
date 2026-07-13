<?php
// app/Models/LeaveApprovalFlow.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveApprovalFlow extends Model
{
    protected $table = 'leave_approval_flows';

    protected $fillable = [
        'department_id',
        'position_id',
        'level',
        'approver_type',
        'approver_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'level' => 'integer',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function position()
    {
        return $this->belongsTo(Position::class);
    }

    public function approver()
    {
        return $this->belongsTo(Employee::class, 'approver_id');
    }

    /**
     * Scope a query to only include active flows
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include flows for a specific department
     */
    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where(function ($q) use ($departmentId) {
            $q->where('department_id', $departmentId)
                ->orWhereNull('department_id');
        });
    }

    /**
     * Scope a query to only include flows for a specific position
     */
    public function scopeForPosition($query, $positionId)
    {
        return $query->where(function ($q) use ($positionId) {
            $q->where('position_id', $positionId)
                ->orWhereNull('position_id');
        });
    }

    /**
     * Get approver type label
     */
    public function getApproverTypeLabelAttribute(): string
    {
        $labels = [
            'manager' => 'Manager',
            'hr' => 'HR',
            'director' => 'Director',
            'custom' => 'Custom',
        ];

        return $labels[$this->approver_type] ?? ucfirst($this->approver_type);
    }

    /**
     * Get approver name if exists
     */
    public function getApproverNameAttribute(): ?string
    {
        if ($this->approver_type === 'custom' && $this->approver) {
            return $this->approver->first_name . ' ' . $this->approver->last_name;
        }

        return null;
    }
}
