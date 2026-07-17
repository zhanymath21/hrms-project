<?php
// app/Models/Notification.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'user_id',
        'from_user_id',
        'type',
        'title',
        'message',
        'data',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(Employee::class, 'user_id');
    }

    public function fromUser()
    {
        return $this->belongsTo(Employee::class, 'from_user_id');
    }

    // Scopes
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    public function scopeRead($query)
    {
        return $query->where('is_read', true);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    // Helper methods
    public function markAsRead()
    {
        $this->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    public function markAsUnread()
    {
        $this->update([
            'is_read' => false,
            'read_at' => null,
        ]);
    }

    public function getTimeAgoAttribute()
    {
        return $this->created_at->diffForHumans();
    }

    public function getIconAttribute()
    {
        $icons = [
            'leave_request' => '📋',
            'leave_approved' => '✅',
            'leave_rejected' => '❌',
            'leave_cancelled' => '🔄',
            'leave_reminder' => '⏰',
            'replacement_request' => '🔄',
            'replacement_approved' => '✅',
            'replacement_rejected' => '❌',
            'balance_updated' => '📊',
            'carry_forward' => '📅',
        ];
        return $icons[$this->type] ?? '📢';
    }

    public function getColorAttribute()
    {
        $colors = [
            'leave_request' => '#f59e0b',
            'leave_approved' => '#10b981',
            'leave_rejected' => '#ef4444',
            'leave_cancelled' => '#6b7280',
            'leave_reminder' => '#3b82f6',
            'replacement_request' => '#f59e0b',
            'replacement_approved' => '#10b981',
            'replacement_rejected' => '#ef4444',
            'balance_updated' => '#8b5cf6',
            'carry_forward' => '#6366f1',
        ];
        return $colors[$this->type] ?? '#6b7280';
    }
}