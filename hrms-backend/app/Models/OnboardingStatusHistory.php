<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OnboardingStatusHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'onboarding_id',
        'old_status',
        'new_status',
        'old_progress',
        'new_progress',
        'notes',
        'updated_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'old_progress' => 'integer',
        'new_progress' => 'integer',
    ];

    // ============ RELATIONSHIPS ============

    public function onboarding()
    {
        return $this->belongsTo(Onboarding::class);
    }

    public function updatedBy()
    {
        return $this->belongsTo(Employee::class, 'updated_by');
    }

    // ============ ACCESSORS ============

    public function getNewStatusLabelAttribute()
    {
        $statuses = [
            'pending' => 'Pending',
            'in_progress' => 'In Progress',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            'on_hold' => 'On Hold',
        ];

        return $statuses[$this->new_status] ?? $this->new_status;
    }

    public function getOldStatusLabelAttribute()
    {
        $statuses = [
            'pending' => 'Pending',
            'in_progress' => 'In Progress',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            'on_hold' => 'On Hold',
        ];

        return $statuses[$this->old_status] ?? $this->old_status;
    }
}
