<?php
// app/Models/ReplacementApprovalFlow.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReplacementApprovalFlow extends Model
{
    protected $table = 'replacement_approval_flows';

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

    /**
     * Get the department for this approval flow
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the position for this approval flow
     */
    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    /**
     * Get the specific approver for this flow
     */
    public function approver(): BelongsTo
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