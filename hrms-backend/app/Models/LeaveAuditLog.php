<?php
// app/Models/LeaveAuditLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveAuditLog extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'leave_audit_logs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'leave_id',
        'performed_by',
        'action',
        'level',
        'notes',
        'old_values',
        'new_values',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'level' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
    protected $dates = [
        'created_at',
        'updated_at',
    ];

    /**
     * Get the leave that owns the audit log.
     */
    public function leave()
    {
        return $this->belongsTo(Leave::class);
    }

    /**
     * Get the user who performed the action.
     */
    public function performedBy()
    {
        return $this->belongsTo(Employee::class, 'performed_by');
    }

    /**
     * Get the user who performed the action (alias).
     */
    public function user()
    {
        return $this->performedBy();
    }

    /**
     * Scope a query to only include logs for a specific leave.
     */
    public function scopeForLeave($query, $leaveId)
    {
        return $query->where('leave_id', $leaveId);
    }

    /**
     * Scope a query to only include logs for a specific action.
     */
    public function scopeAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope a query to only include logs for a specific level.
     */
    public function scopeLevel($query, $level)
    {
        return $query->where('level', $level);
    }

    /**
     * Scope a query to only include logs performed by a specific user.
     */
    public function scopePerformedBy($query, $userId)
    {
        return $query->where('performed_by', $userId);
    }

    /**
     * Scope a query to order by most recent first.
     */
    public function scopeRecent($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Scope a query to order by oldest first.
     */
    public function scopeOldest($query)
    {
        return $query->orderBy('created_at', 'asc');
    }

    /**
     * Get the action label.
     */
    public function getActionLabelAttribute()
    {
        $labels = [
            'created' => 'Created',
            'submitted' => 'Submitted',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'cancelled' => 'Cancelled',
            'updated' => 'Updated',
            'deleted' => 'Deleted',
            'restored' => 'Restored',
            'reassigned' => 'Reassigned',
            'escalated' => 'Escalated',
            'reminded' => 'Reminded',
        ];

        return $labels[$this->action] ?? ucfirst($this->action);
    }

    /**
     * Get the action icon.
     */
    public function getActionIconAttribute()
    {
        $icons = [
            'created' => '📝',
            'submitted' => '📤',
            'approved' => '✅',
            'rejected' => '❌',
            'cancelled' => '🔄',
            'updated' => '✏️',
            'deleted' => '🗑️',
            'restored' => '♻️',
            'reassigned' => '👤',
            'escalated' => '⬆️',
            'reminded' => '🔔',
        ];

        return $icons[$this->action] ?? '📋';
    }

    /**
     * Get the action color.
     */
    public function getActionColorAttribute()
    {
        $colors = [
            'created' => '#10b981',      // green
            'submitted' => '#3b82f6',     // blue
            'approved' => '#10b981',      // green
            'rejected' => '#ef4444',      // red
            'cancelled' => '#6b7280',     // gray
            'updated' => '#f59e0b',       // yellow
            'deleted' => '#ef4444',       // red
            'restored' => '#10b981',      // green
            'reassigned' => '#8b5cf6',    // purple
            'escalated' => '#f97316',     // orange
            'reminded' => '#f59e0b',      // yellow
        ];

        return $colors[$this->action] ?? '#6b7280';
    }

    /**
     * Get the formatted old values as string.
     */
    public function getOldValuesStringAttribute()
    {
        if (empty($this->old_values)) {
            return null;
        }

        $strings = [];
        foreach ($this->old_values as $key => $value) {
            $strings[] = ucfirst(str_replace('_', ' ', $key)) . ': ' . $value;
        }

        return implode(', ', $strings);
    }

    /**
     * Get the formatted new values as string.
     */
    public function getNewValuesStringAttribute()
    {
        if (empty($this->new_values)) {
            return null;
        }

        $strings = [];
        foreach ($this->new_values as $key => $value) {
            $strings[] = ucfirst(str_replace('_', ' ', $key)) . ': ' . $value;
        }

        return implode(', ', $strings);
    }

    /**
     * Get the summary of changes.
     */
    public function getSummaryAttribute()
    {
        if (empty($this->old_values) || empty($this->new_values)) {
            return null;
        }

        $changes = [];
        foreach ($this->new_values as $key => $newValue) {
            $oldValue = $this->old_values[$key] ?? null;
            if ($oldValue != $newValue) {
                $changes[] = ucfirst(str_replace('_', ' ', $key)) . ': ' . $oldValue . ' → ' . $newValue;
            }
        }

        return implode(', ', $changes);
    }

    /**
     * Create an audit log entry.
     */
    public static function log($leaveId, $userId, $action, $notes = null, $oldValues = null, $newValues = null, $level = null)
    {
        return static::create([
            'leave_id' => $leaveId,
            'performed_by' => $userId,
            'action' => $action,
            'level' => $level,
            'notes' => $notes,
            'old_values' => $oldValues,
            'new_values' => $newValues,
        ]);
    }

    /**
     * Log leave creation.
     */
    public static function logCreated($leave, $userId)
    {
        return static::log(
            $leave->id,
            $userId,
            'created',
            'Leave request created',
            null,
            $leave->toArray(),
            0
        );
    }

    /**
     * Log leave submission.
     */
    public static function logSubmitted($leave, $userId)
    {
        return static::log(
            $leave->id,
            $userId,
            'submitted',
            'Leave request submitted for approval',
            null,
            ['status' => 'pending'],
            0
        );
    }

    /**
     * Log leave approval.
     */
    public static function logApproved($leave, $approverId, $level, $notes = null)
    {
        return static::log(
            $leave->id,
            $approverId,
            'approved',
            $notes ?? 'Leave request approved',
            ['status' => $leave->status],
            ['status' => 'approved'],
            $level
        );
    }

    /**
     * Log leave rejection.
     */
    public static function logRejected($leave, $rejecterId, $level, $reason)
    {
        return static::log(
            $leave->id,
            $rejecterId,
            'rejected',
            $reason,
            ['status' => $leave->status],
            ['status' => 'rejected', 'rejection_reason' => $reason],
            $level
        );
    }

    /**
     * Log leave cancellation.
     */
    public static function logCancelled($leave, $userId, $reason = null)
    {
        return static::log(
            $leave->id,
            $userId,
            'cancelled',
            $reason ?? 'Leave request cancelled',
            ['status' => $leave->status],
            ['status' => 'cancelled'],
            null
        );
    }

    /**
     * Log leave update.
     */
    public static function logUpdated($leave, $userId, $oldValues, $newValues)
    {
        return static::log(
            $leave->id,
            $userId,
            'updated',
            'Leave request updated',
            $oldValues,
            $newValues,
            null
        );
    }

    /**
     * Log leave deletion.
     */
    public static function logDeleted($leave, $userId)
    {
        return static::log(
            $leave->id,
            $userId,
            'deleted',
            'Leave request deleted',
            $leave->toArray(),
            null,
            null
        );
    }

    /**
     * Log leave restoration.
     */
    public static function logRestored($leave, $userId)
    {
        return static::log(
            $leave->id,
            $userId,
            'restored',
            'Leave request restored',
            null,
            $leave->toArray(),
            null
        );
    }

    /**
     * Log approval reassignment.
     */
    public static function logReassigned($leave, $userId, $oldApproverId, $newApproverId, $level)
    {
        return static::log(
            $leave->id,
            $userId,
            'reassigned',
            "Approval reassigned from approver ID {$oldApproverId} to {$newApproverId}",
            ['approver_id' => $oldApproverId],
            ['approver_id' => $newApproverId],
            $level
        );
    }

    /**
     * Log approval escalation.
     */
    public static function logEscalated($leave, $userId, $level, $reason = null)
    {
        return static::log(
            $leave->id,
            $userId,
            'escalated',
            $reason ?? "Approval escalated to level {$level}",
            null,
            ['level' => $level],
            $level
        );
    }

    /**
     * Log reminder sent.
     */
    public static function logReminded($leave, $userId, $approverId, $level)
    {
        return static::log(
            $leave->id,
            $userId,
            'reminded',
            "Reminder sent to approver ID {$approverId} at level {$level}",
            null,
            ['reminded_at' => now()],
            $level
        );
    }

    /**
     * Get human-readable timeline of events.
     */
    public function getTimelineAttribute()
    {
        $performer = $this->performedBy ? $this->performedBy->full_name : 'System';
        $action = $this->action_label;
        $time = $this->created_at->format('d M Y H:i');

        return "{$performer} {$action} at {$time}";
    }

    /**
     * Get the audit log as an array for API response.
     */
    public function toApiArray()
    {
        return [
            'id' => $this->id,
            'leave_id' => $this->leave_id,
            'performed_by' => $this->performedBy ? [
                'id' => $this->performedBy->id,
                'name' => $this->performedBy->full_name,
                'employee_id' => $this->performedBy->employee_id,
            ] : null,
            'action' => $this->action,
            'action_label' => $this->action_label,
            'action_icon' => $this->action_icon,
            'action_color' => $this->action_color,
            'level' => $this->level,
            'notes' => $this->notes,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'summary' => $this->summary,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'timeline' => $this->timeline,
        ];
    }
}