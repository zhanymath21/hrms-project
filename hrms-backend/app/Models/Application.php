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
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ============ RELATIONSHIPS ============

    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }

    public function vacancy()
    {
        return $this->belongsTo(Vacancy::class);
    }

    public function statusHistories()
    {
        return $this->hasMany(ApplicationStatusHistory::class)->orderBy('created_at', 'desc');
    }

    // ============ SCOPES ============

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

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByCandidate($query, $candidateId)
    {
        return $query->where('candidate_id', $candidateId);
    }

    public function scopeByVacancy($query, $vacancyId)
    {
        return $query->where('vacancy_id', $vacancyId);
    }

    // ============ ACCESSORS ============

    public function getStatusLabelAttribute()
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

        return $statuses[$this->status] ?? $this->status;
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

        return $colors[$this->status] ?? '#6b7280';
    }

    public function getStatusHistoryWithUsersAttribute()
    {
        return $this->statusHistories()
            ->with('updatedBy')
            ->get()
            ->map(function ($history) {
                return [
                    'id' => $history->id,
                    'old_status' => $history->old_status,
                    'new_status' => $history->new_status,
                    'notes' => $history->notes,
                    'changed_by' => $history->updatedBy ?
                        $history->updatedBy->first_name . ' ' . $history->updatedBy->last_name :
                        'System',
                    'changed_by_id' => $history->updated_by,
                    'created_at' => $history->created_at,
                ];
            });
    }

    // ============ BOOT METHOD ============

    protected static function boot()
    {
        parent::boot();

        static::created(function ($application) {
            ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'old_status' => null,
                'new_status' => $application->status ?? 'new',
                'notes' => 'Application created',
                'updated_by' => auth()->id() ?? null,
            ]);
        });

        static::updating(function ($application) {
            if ($application->isDirty('status')) {
                $oldStatus = $application->getOriginal('status');
                $newStatus = $application->status;

                ApplicationStatusHistory::create([
                    'application_id' => $application->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'notes' => $application->notes ?? null,
                    'updated_by' => auth()->id() ?? null,
                ]);
            }
        });
    }
}
