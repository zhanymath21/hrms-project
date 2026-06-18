<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Application extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'candidate_id',
        'vacancy_id',
        'status',
        'notes',
        'interview_date',
        'interview_notes',
    ];

    protected $casts = [
        'interview_date' => 'datetime',
    ];

    // Relations
    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }

    public function vacancy()
    {
        return $this->belongsTo(Vacancy::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }
}
