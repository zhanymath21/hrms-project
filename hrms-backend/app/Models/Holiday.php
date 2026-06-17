<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PPEHistory extends Model
{
    use HasFactory;

    protected $table = 'ppe_histories';

    protected $fillable = [
        'ppe_item_id',
        'action_type',
        'old_data',
        'new_data',
        'description',
        'notes',
        'performed_by',
        'performed_by_name',
    ];

    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
    ];

    /**
     * Get the PPE item
     */
    public function ppeItem()
    {
        return $this->belongsTo(PPEItem::class, 'ppe_item_id');
    }

    /**
     * Get the user who performed this action
     */
    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    /**
     * Get action type label with icon
     */
    public function getActionLabelAttribute(): string
    {
        return match ($this->action_type) {
            'created' => '🆕 Created',
            'updated' => '✏️ Updated',
            'assigned' => '👤 Assigned',
            'returned' => '🔄 Returned',
            'moved' => '📍 Moved',
            'maintenance' => '🔧 Maintenance',
            'write_off' => '🗑️ Write-off',
            'condition_change' => '⚠️ Condition Changed',
            default => '📋 ' . ucfirst($this->action_type),
        };
    }

    /**
     * Get action color for UI
     */
    public function getActionColorAttribute(): string
    {
        return match ($this->action_type) {
            'created' => '#4caf50',
            'updated' => '#2196f3',
            'assigned' => '#ff9800',
            'returned' => '#9c27b0',
            'moved' => '#00bcd4',
            'maintenance' => '#ff5722',
            'write_off' => '#f44336',
            'condition_change' => '#ff9800',
            default => '#757575',
        };
    }
}
