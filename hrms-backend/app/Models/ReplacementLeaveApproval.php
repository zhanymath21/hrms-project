<?php
// app/Models/ReplacementLeaveApproval.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReplacementLeaveApproval extends Model
{
    protected $fillable = [
        'replacement_leave_id',
        'approver_id',
        'level',
        'status',
        'notes',
        'approved_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function replacementLeave()
    {
        return $this->belongsTo(ReplacementLeave::class);
    }

    public function approver()
    {
        return $this->belongsTo(Employee::class, 'approver_id');
    }
}
