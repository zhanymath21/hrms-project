<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LostTimeInjuryHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'lost_time_injury_id',
        'old_status',
        'new_status',
        'old_approval_status',
        'new_approval_status',
        'old_days_lost',
        'new_days_lost',
        'notes',
        'updated_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'old_days_lost' => 'integer',
        'new_days_lost' => 'integer',
    ];

    public function lostTimeInjury()
    {
        return $this->belongsTo(LostTimeInjury::class);
    }

    public function updatedBy()
    {
        return $this->belongsTo(Employee::class, 'updated_by');
    }
}
