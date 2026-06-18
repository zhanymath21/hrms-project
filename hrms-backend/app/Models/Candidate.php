<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Candidate extends Model
{
    use HasFactory, SoftDeletes;

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
    ];

    protected $casts = [
        'experience_years' => 'integer',
        'current_salary' => 'decimal:2',
        'expected_salary' => 'decimal:2',
    ];

    // Accessor for full name
    public function getFullNameAttribute()
    {
        return $this->first_name . ' ' . $this->last_name;
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
