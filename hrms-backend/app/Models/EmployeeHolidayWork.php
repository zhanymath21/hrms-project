<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeHolidayWork extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'work_date',
        'day_type',
        'hours_worked',
        'is_replacement_taken',
        'replacement_date',
        'notes',
    ];

    protected $casts = [
        'work_date' => 'date',
        'replacement_date' => 'date',
        'is_replacement_taken' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
