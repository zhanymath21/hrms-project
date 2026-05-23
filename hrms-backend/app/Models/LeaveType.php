<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'days_per_year',
        'requires_approval',
        'is_paid',
        'is_active',
        // Tambahan untuk seniority & accrual
        'seniority_enabled',
        'seniority_3_years_bonus',
        'seniority_6_years_bonus',
        'allow_carry_forward',
        'max_carry_forward_days',
        'probation_allowed',
        'accrual_rate',
        'accrual_type',
    ];

    protected $casts = [
        'requires_approval' => 'boolean',
        'is_paid' => 'boolean',
        'is_active' => 'boolean',
        'seniority_enabled' => 'boolean',
        'allow_carry_forward' => 'boolean',
        'probation_allowed' => 'boolean',
        'seniority_3_years_bonus' => 'integer',
        'seniority_6_years_bonus' => 'integer',
        'max_carry_forward_days' => 'integer',
        'accrual_rate' => 'decimal:2',
    ];

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    // Helper untuk cek apakah ini Annual Leave
    public function isAnnualLeave(): bool
    {
        return $this->code === 'AL';
    }

    // Helper untuk cek apakah ini Sick Leave
    public function isSickLeave(): bool
    {
        return $this->code === 'SL';
    }

    // Helper untuk cek apakah ini Special Leave
    public function isSpecialLeave(): bool
    {
        return $this->code === 'SPL';
    }
}
