<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Candidate extends Model
{
    use HasFactory, SoftDeletes;


    // ✅ Define status constants
    const STATUS_NEW = 'new';
    const STATUS_SCREENING = 'screening';
    const STATUS_INTERVIEW = 'interview';
    const STATUS_TECHNICAL_TEST = 'technical_test';
    const STATUS_HR_INTERVIEW = 'hr_interview';
    const STATUS_OFFER = 'offer';
    const STATUS_OFFERED = 'offered';
    const STATUS_HIRED = 'hired';
    const STATUS_REJECTED = 'rejected';
    const STATUS_WITHDRAWN = 'withdrawn';

    // ✅ Get all statuses
    public static function getStatuses()
    {
        return [
            self::STATUS_NEW,
            self::STATUS_SCREENING,
            self::STATUS_INTERVIEW,
            self::STATUS_TECHNICAL_TEST,
            self::STATUS_HR_INTERVIEW,
            self::STATUS_OFFER,
            self::STATUS_OFFERED,
            self::STATUS_HIRED,
            self::STATUS_REJECTED,
            self::STATUS_WITHDRAWN,
        ];
    }

    // ✅ Get status labels
    public static function getStatusLabels()
    {
        return [
            self::STATUS_NEW => 'New',
            self::STATUS_SCREENING => 'Screening',
            self::STATUS_INTERVIEW => 'Interview',
            self::STATUS_TECHNICAL_TEST => 'Technical Test',
            self::STATUS_HR_INTERVIEW => 'HR Interview',
            self::STATUS_OFFER => 'Offer',
            self::STATUS_OFFERED => 'Offered',
            self::STATUS_HIRED => 'Hired',
            self::STATUS_REJECTED => 'Rejected',
            self::STATUS_WITHDRAWN => 'Withdrawn',
        ];
    }

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'position_applied',
        'experience_years',
        'current_salary',
        'expected_salary',
        'location',
        'status',
        'notes',
        'cv_file_name',
        'cv_file_path',
        'cv_file_type',
        'cv_file_size',
        'cv_url',
    ];

    protected $casts = [
        'experience_years' => 'integer',
        'current_salary' => 'decimal:2',
        'expected_salary' => 'decimal:2',
        'cv_file_size' => 'integer',
    ];

    // Accessor for full name
    public function getFullNameAttribute()
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    public function statusHistories()
    {
        return $this->hasMany(CandidateStatusHistory::class)->orderBy('created_at', 'desc');
    }
    // Accessor for CV URL
    public function getCvUrlAttribute()
    {
        if ($this->cv_file_path) {
            return asset('storage/' . $this->cv_file_path);
        }
        return null;
    }

    // Relations
    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    public function onboarding()
    {
        return $this->hasOne(Onboarding::class);
    }

    // Scope for filtering
    public function scopeHasCV($query)
    {
        return $query->whereNotNull('cv_file_path');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }
}
