<?php
// app/Models/LeaveApproval.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveApproval extends Model
{
    protected $fillable = [
        'leave_id',
        'approver_id',
        'level',
        'status',
        'notes',
        'approved_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'level' => 'integer',
    ];

    protected $attributes = [
        'status' => 'pending',
    ];

    // Relationships
    public function leave()
    {
        return $this->belongsTo(Leave::class);
    }

    public function approver()
    {
        return $this->belongsTo(Employee::class, 'approver_id');
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

    public function scopeByLevel($query, $level)
    {
        return $query->where('level', $level);
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

    public function approve($notes = null)
    {
        $this->update([
            'status' => 'approved',
            'notes' => $notes,
            'approved_at' => now(),
        ]);
    }

    public function reject($notes = null)
    {
        $this->update([
            'status' => 'rejected',
            'notes' => $notes,
            'approved_at' => now(),
        ]);
    }
}