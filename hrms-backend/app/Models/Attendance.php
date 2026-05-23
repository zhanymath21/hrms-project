<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'date',
        'status',
        'total_hours',
        'overtime_hours',
        'total_sessions',
        'first_check_in',
        'last_check_out',
        'is_approved',
        'remarks',
    ];

    protected $casts = [
        'date' => 'date',
        'total_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'is_approved' => 'boolean',
    ];

    /**
     * Relationship with Employee
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Relationship with Attendance Sessions
     */
    public function sessions()
    {
        return $this->hasMany(AttendanceSession::class)->orderBy('session_number');
    }

    /**
     * Get active (ongoing) session
     */
    public function activeSession()
    {
        return $this->sessions()->where('status', 'ongoing')->first();
    }

    /**
     * Get next session number
     */
    public function nextSessionNumber(): int
    {
        $count = $this->sessions()->count();
        return $count + 1;
    }

    /**
     * Check if can check-in (no active session and less than 4 sessions)
     */
    public function canCheckIn(): bool
    {
        return !$this->activeSession() && $this->total_sessions < 4;
    }

    /**
     * Check if can check-out (has active session)
     */
    public function canCheckOut(): bool
    {
        return !is_null($this->activeSession());
    }
}