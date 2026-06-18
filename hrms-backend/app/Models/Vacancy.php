<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vacancy extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'department_id',
        'description',
        'requirements',
        'location',
        'salary_min',
        'salary_max',
        'status',
        'applicants_count',
        'posted_date',
        'closing_date',
    ];

    protected $casts = [
        'salary_min' => 'decimal:2',
        'salary_max' => 'decimal:2',
        'posted_date' => 'date',
        'closing_date' => 'date',
    ];

    // Relations
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    public function getApplicantsCountAttribute()
    {
        return $this->applications()->count();
    }

    // Scopes
    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'open')
            ->where(function ($q) {
                $q->whereNull('closing_date')
                    ->orWhere('closing_date', '>=', now());
            });
    }
}
