<?php
// app/Models/LeaveApprovalFlow.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveApprovalFlow extends Model
{
    protected $fillable = [
        'name',
        'applicable_position',
        'department_id',
        'position_id',
        'level',
        'approver_type',
        'approver_id',
        'stages',
        'is_active',
    ];

    protected $casts = [
        'stages' => 'array',
        'is_active' => 'boolean',
        'level' => 'integer',
    ];

    protected $attributes = [
        'is_active' => true,
    ];

    // Relationships
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

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('level');
    }

    public function scopeForEmployee($query, Employee $employee)
    {
        return $query->where(function ($q) use ($employee) {
            $q->where('department_id', $employee->department_id)
                ->orWhereNull('department_id');
        })->where(function ($q) use ($employee) {
            $q->where('position_id', $employee->position_id)
                ->orWhereNull('position_id');
        });
    }

    // Helper Methods
    public function getApproverTypeLabelAttribute()
    {
        $labels = [
            'manager' => 'Manager',
            'hr' => 'HR',
            'director' => 'Director',
            'custom' => 'Custom',
        ];
        return $labels[$this->approver_type] ?? ucfirst($this->approver_type);
    }

    public function getApproverNameAttribute()
    {
        if ($this->approver_type === 'custom' && $this->approver_id) {
            return $this->approver->full_name ?? 'Unknown';
        }
        return $this->approver_type_label;
    }

    public function appliesToEmployee(Employee $employee): bool
    {
        if (!$this->is_active) return false;

        $departmentMatch = is_null($this->department_id) ||
            $this->department_id === $employee->department_id;

        $positionMatch = is_null($this->position_id) ||
            $this->position_id === $employee->position_id;

        return $departmentMatch && $positionMatch;
    }

    public function isApprover(Employee $employee): bool
    {
        if ($this->approver_type !== 'custom') return false;
        return $this->approver_id === $employee->id;
    }
}