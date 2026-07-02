<?php
// app/Models/LeaveType.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'days_per_year',
        'is_paid',
        'allow_carry_forward',
        'max_carry_forward_days',
        'is_active',
        'require_attachment',
    ];

    protected $casts = [
        'days_per_year' => 'decimal:1',
        'max_carry_forward_days' => 'decimal:1',
        'is_paid' => 'boolean',
        'allow_carry_forward' => 'boolean',
        'is_active' => 'boolean',
        'require_attachment' => 'boolean',
    ];

    public function balances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }
}