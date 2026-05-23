<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'start_time',
        'end_time',
        'break_start_time',
        'break_end_time',
        'break_duration_minutes',
        'total_working_hours',
        'working_days',
        'is_overnight',
        'is_active',
        'is_default',
        'description',
    ];

    protected $casts = [
        'working_days' => 'array',
        'is_overnight' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function employeeSchedules()
    {
        return $this->hasMany(EmployeeSchedule::class);
    }

    public function employees()
    {
        return $this->belongsToMany(Employee::class, 'employee_schedules')
            ->withPivot(['start_date', 'end_date', 'is_active'])
            ->withTimestamps();
    }
}