<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'attendance_id',
        'employee_id',
        'date',
        'session_number',
        'check_in_time',
        'check_out_time',
        'session_hours',
        'check_in_location',
        'check_out_location',
        'check_in_ip',
        'check_out_ip',
        'status',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'session_hours' => 'decimal:2',
    ];

    /**
     * Relationship with Attendance
     */
    public function attendance()
    {
        return $this->belongsTo(Attendance::class);
    }

    /**
     * Relationship with Employee
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get duration in hours
     */
    public function getDurationHoursAttribute(): float
    {
        if (!$this->check_in_time || !$this->check_out_time) {
            return 0;
        }

        $checkIn = \Carbon\Carbon::parse($this->check_in_time);
        $checkOut = \Carbon\Carbon::parse($this->check_out_time);

        return round($checkIn->diffInMinutes($checkOut) / 60, 2);
    }

    /**
     * Check if session is active
     */
    public function isActive(): bool
    {
        return $this->status === 'ongoing';
    }

    /**
     * Check if session is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}