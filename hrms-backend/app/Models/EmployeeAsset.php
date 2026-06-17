<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'asset_type',
        'asset_name',
        'serial_number',
        'condition',
        'notes',
        'status',
        'assigned_date',
        'return_date',
        'return_reason',
        'return_condition',
        'return_notes',
        'replace_reason',
        'replaced_by_asset_id',
        'replacement_for_asset_id',
    ];

    protected $casts = [
        'assigned_date' => 'date',
        'return_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function replacementAsset()
    {
        return $this->belongsTo(EmployeeAsset::class, 'replaced_by_asset_id');
    }

    public function originalAsset()
    {
        return $this->belongsTo(EmployeeAsset::class, 'replacement_for_asset_id');
    }

    // Scope
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeReturned($query)
    {
        return $query->where('status', 'returned');
    }
}
