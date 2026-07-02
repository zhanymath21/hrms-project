<?php
// app/Models/LeaveApprovalFlow.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveApprovalFlow extends Model
{
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
}