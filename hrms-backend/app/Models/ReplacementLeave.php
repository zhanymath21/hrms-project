<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReplacementLeave extends Model
{
    protected $table = 'replacement_leaves';

    protected $fillable = [
        'employee_id',
        'work_date',
        'work_day_type',
        'hours_worked',
        'replacement_date',
        'reason',
        'days_to_add',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
    ];

    protected $casts = [
        'work_date' => 'date',
        'replacement_date' => 'date',
        'approved_at' => 'datetime',
        'hours_worked' => 'integer',
        'days_to_add' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(Employee::class, 'approved_by');
    }

    // Auto generate days_to_add before saving
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->days_to_add = $model->hours_worked >= 8 ? 1 : 0.5;
        });
    }
}
