<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Onboarding extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'onboarding';

    protected $fillable = [
        'candidate_id',
        'employee_id',
        'department_id',
        'position_id',
        'position_title',
        'start_date',
        'progress',
        'status',
        'notes',
        'tasks',
    ];

    protected $casts = [
        'start_date' => 'date',
        'progress' => 'integer',
        'tasks' => 'array',
    ];

    // Relations
    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function position()
    {
        return $this->belongsTo(Position::class);
    }

    // Scopes
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }
}
