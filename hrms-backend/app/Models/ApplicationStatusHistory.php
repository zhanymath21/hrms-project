<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApplicationStatusHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'old_status',
        'new_status',
        'notes',
        'updated_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ============ RELATIONSHIPS ============

    public function application()
    {
        return $this->belongsTo(Application::class);
    }

    public function updatedBy()
    {
        return $this->belongsTo(Employee::class, 'updated_by');
    }

    // ============ ACCESSORS ============

    public function getNewStatusLabelAttribute()
    {
        $statuses = [
            'new' => 'New',
            'screening' => 'Screening',
            'interview' => 'Interview',
            'technical_test' => 'Technical Test',
            'hr_interview' => 'HR Interview',
            'offer' => 'Offer',
            'hired' => 'Hired',
            'rejected' => 'Rejected',
            'withdrawn' => 'Withdrawn',
            'pending' => 'Pending',
            'accepted' => 'Accepted',
        ];

        return $statuses[$this->new_status] ?? $this->new_status;
    }

    public function getOldStatusLabelAttribute()
    {
        $statuses = [
            'new' => 'New',
            'screening' => 'Screening',
            'interview' => 'Interview',
            'technical_test' => 'Technical Test',
            'hr_interview' => 'HR Interview',
            'offer' => 'Offer',
            'hired' => 'Hired',
            'rejected' => 'Rejected',
            'withdrawn' => 'Withdrawn',
            'pending' => 'Pending',
            'accepted' => 'Accepted',
        ];

        return $statuses[$this->old_status] ?? $this->old_status;
    }

    public function getStatusColorAttribute()
    {
        $colors = [
            'new' => '#3b82f6',
            'screening' => '#6366f1',
            'interview' => '#f59e0b',
            'technical_test' => '#8b5cf6',
            'hr_interview' => '#3b82f6',
            'offer' => '#10b981',
            'hired' => '#10b981',
            'rejected' => '#ef4444',
            'withdrawn' => '#6b7280',
            'pending' => '#f59e0b',
            'accepted' => '#10b981',
        ];

        return $colors[$this->new_status] ?? '#6b7280';
    }
}
