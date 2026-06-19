<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CandidateStatusHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'candidate_id',
        'old_status',
        'new_status',
        'notes',
        'updated_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    // 🔥 Relasi ke Candidate
    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }

    // 🔥 PERBAIKAN: Relasi ke Employee (bukan User)
    public function updatedBy()
    {
        return $this->belongsTo(Employee::class, 'updated_by');
    }

    // Accessor untuk label status
    public function getOldStatusLabelAttribute()
    {
        return $this->getStatusLabel($this->old_status);
    }

    public function getNewStatusLabelAttribute()
    {
        return $this->getStatusLabel($this->new_status);
    }

    private function getStatusLabel($status)
    {
        $labels = [
            'new' => 'New',
            'screening' => 'Screening',
            'interview' => 'Interview',
            'technical_test' => 'Technical Test',
            'hr_interview' => 'HR Interview',
            'offer' => 'Offer',
            'hired' => 'Hired',
            'rejected' => 'Rejected',
            'withdrawn' => 'Withdrawn',
        ];
        return $labels[$status] ?? $status;
    }

    // 🔥 Accessor untuk nama employee
    public function getUpdatedByNameAttribute()
    {
        if ($this->updatedBy) {
            return $this->updatedBy->first_name . ' ' . $this->updatedBy->last_name;
        }
        return 'System';
    }
}
