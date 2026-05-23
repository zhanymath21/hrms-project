<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeOfficeLocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'office_location_id',
        'is_primary',
        'is_active',
        'assigned_date',
        'end_date',
        'notes',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'is_active' => 'boolean',
        'assigned_date' => 'date',
        'end_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function officeLocation()
    {
        return $this->belongsTo(OfficeLocation::class);
    }

    /**
     * Get assigned offices for an employee
     */
    public static function getAssignedOffices($employeeId)
    {
        return self::where('employee_id', $employeeId)
            ->where('is_active', true)
            ->with('officeLocation')
            ->get()
            ->pluck('officeLocation');
    }
}
