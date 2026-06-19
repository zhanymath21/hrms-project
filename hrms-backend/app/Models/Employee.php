<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Employee extends Authenticatable
{
    use HasApiTokens, HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'first_name',
        'last_name',
        'email',
        'password',
        'phone',
        'date_of_birth',
        'gender',
        'national_id',
        'address',
        'hire_date',
        'probation_end_date',
        'employment_status',
        'department_id',
        'position_id',
        'employment_type',
        'status',
        'salary',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relation',
        'profile_photo',
        'card_number',
        'card_type',
        'use_card',
        'manager_id',
    ];

    protected $hidden = [
        'password',
        'national_id',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'hire_date' => 'date',
        'probation_end_date' => 'date',
        'date_of_birth' => 'date',
        'salary' => 'decimal:2',
        'use_card' => 'boolean',
    ];

    // Relationships
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function position()
    {
        return $this->belongsTo(Position::class);
    }
    public function cards()
    {
        return $this->hasMany(EmployeeCard::class);
    }

    public function activeCard()
    {
        return $this->hasOne(EmployeeCard::class)
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expiry_date')
                    ->orWhere('expiry_date', '>=', now());
            });
    }

    public function manager()
    {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    public function subordinates()
    {
        return $this->hasMany(Employee::class, 'manager_id');
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function documents()
    {
        return $this->hasMany(EmployeeDocument::class);
    }

    public function schedules()
    {
        return $this->hasMany(EmployeeSchedule::class);
    }

    public function workSchedules()
    {
        return $this->belongsToMany(WorkSchedule::class, 'employee_schedules')
            ->withPivot(['start_date', 'end_date', 'is_active'])
            ->withTimestamps();
    }

    public function uploadedDocuments()
    {
        return $this->hasMany(EmployeeDocument::class, 'uploaded_by');
    }

    public function approvedLeaves()
    {
        return $this->hasMany(Leave::class, 'approved_by');
    }

    // Accessors
    public function getFullNameAttribute()
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function getProfilePhotoUrlAttribute()
    {
        if ($this->profile_photo) {
            return asset('storage/' . $this->profile_photo);
        }
        return null;
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('employee_id', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%");
        });
    }
    // Di dalam Employee model, tambahkan:
    public function activeSchedule()
    {
        return $this->hasOne(EmployeeSchedule::class)
            ->where('is_active', true)
            ->where('start_date', '<=', now()->format('Y-m-d'))
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', now()->format('Y-m-d'));
            })
            ->latest('start_date');
    }

    protected static function boot()
    {
        parent::boot();

        // Auto-generate employee_id saat creating
        static::creating(function ($employee) {
            if (empty($employee->employee_id)) {
                $count = static::withTrashed()->count() + 1;
                $employee->employee_id = 'EMP' . date('Y') . str_pad($count, 4, '0', STR_PAD_LEFT);
            }

            // Auto-generate card number jika tidak diisi
            if (empty($employee->card_number) && $employee->use_card) {
                $prefix = 'HRMS';
                $year = date('y');
                $random = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
                $cardNumber = "{$prefix}-{$year}-{$random}";

                while (static::where('card_number', $cardNumber)->exists()) {
                    $random = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
                    $cardNumber = "{$prefix}-{$year}-{$random}";
                }

                $employee->card_number = $cardNumber;
            }
        });
    }
    // Relationship
    public function assignedOffices()
    {
        return $this->hasMany(EmployeeOfficeLocation::class)
            ->where('is_active', true);
    }

    public function defaultOffice()
    {
        return $this->belongsTo(OfficeLocation::class, 'default_office_id');
    }

    public function officeLocations()
    {
        return $this->belongsToMany(OfficeLocation::class, 'employee_office_locations')
            ->withPivot(['is_primary', 'is_active', 'assigned_date', 'end_date'])
            ->wherePivot('is_active', true)
            ->withTimestamps();
    }

    public function isOnProbation(): bool
    {
        $probationEndDate = $this->probation_end_date
            ? Carbon::parse($this->probation_end_date)
            : Carbon::parse($this->hire_date)->addMonths(3);

        return Carbon::now()->lt($probationEndDate);
    }

    /**
     * Get probation end date
     */
    public function getProbationEndDateAttribute($value)
    {
        if ($value) {
            return $value;
        }

        // Default probation is 3 months after hire date
        return Carbon::parse($this->hire_date)->addMonths(3)->format('Y-m-d');
    }

    /**
     * Get annual leave details for this employee
     */
    public function getAnnualLeaveDetails(): array
    {
        return $this->calculateAnnualLeave($this);
    }

    public function statusHistories()
    {
        return $this->hasMany(CandidateStatusHistory::class, 'updated_by');
    }
}
