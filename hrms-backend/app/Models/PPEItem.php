<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PPEItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'ppe_items';

    protected $fillable = [
        'name',
        'code',
        'category_id',
        'size',
        'color',
        'material',
        'manufacturer',
        'model',
        'serial_number',
        'location',
        'current_holder_id',
        'current_holder_name',
        'current_holder_department',
        'current_holder_position',
        'assigned_at',
        'expected_return_date',
        'price',
        'purchase_date',
        'supplier',
        'invoice_number',
        'description',
        'specifications',
        'certification',
        'certification_date',
        'expiry_date',
        'photo',
        'manual_file',
        'sds_file',
        'status',
        'condition',
        'write_off_date',
        'write_off_by',
        'write_off_reason',
        'write_off_notes',
        'write_off_approval_number',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'expected_return_date' => 'datetime',
        'purchase_date' => 'date',
        'certification_date' => 'date',
        'expiry_date' => 'date',
        'write_off_date' => 'datetime',
        'price' => 'decimal:2',
    ];

    /**
     * Get the category
     */
    public function category()
    {
        return $this->belongsTo(PPECategory::class, 'category_id');
    }

    /**
     * Get current holder (user)
     */
    public function currentHolder()
    {
        return $this->belongsTo(Employee::class, 'current_holder_id');
    }

    public function creator()
    {
        return $this->belongsTo(Employee::class, 'created_by');
    }

    public function writeOffBy()
    {
        return $this->belongsTo(Employee::class, 'write_off_by');
    }

    /**
     * Get all history logs
     */
    public function histories()
    {
        return $this->hasMany(PPEHistory::class, 'ppe_item_id')->orderBy('created_at', 'desc');
    }

    /**
     * Get latest history
     */
    public function latestHistory()
    {
        return $this->hasOne(PPEHistory::class, 'ppe_item_id')->latestOfMany();
    }

    // ========== SCOPES ==========

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function scopeAssigned($query)
    {
        return $query->where('status', 'assigned');
    }

    public function scopeMaintenance($query)
    {
        return $query->where('status', 'maintenance');
    }

    public function scopeWriteOff($query)
    {
        return $query->where('status', 'write_off');
    }

    public function scopeGoodCondition($query)
    {
        return $query->where('condition', 'good');
    }

    public function scopeByCategory($query, $categoryId)
    {
        return $query->where('category_id', $categoryId);
    }

    public function scopeByLocation($query, $location)
    {
        return $query->where('location', 'like', "%{$location}%");
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%")
                ->orWhere('serial_number', 'like', "%{$search}%")
                ->orWhere('current_holder_name', 'like', "%{$search}%")
                ->orWhere('manufacturer', 'like', "%{$search}%")
                ->orWhere('location', 'like', "%{$search}%");
        });
    }

    // ========== HELPERS ==========

    /**
     * Check if PPE is expired
     */
    public function isExpired(): bool
    {
        if (!$this->expiry_date) return false;
        return now()->gt($this->expiry_date);
    }

    /**
     * Check if PPE is available for assignment
     */
    public function isAvailable(): bool
    {
        return $this->status === 'available' && !$this->isExpired();
    }

    /**
     * Get status badge color
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'available' => '#4caf50',
            'assigned' => '#2196f3',
            'maintenance' => '#ff9800',
            'write_off' => '#f44336',
            default => '#757575',
        };
    }

    /**
     * Get condition badge color
     */
    public function getConditionColorAttribute(): string
    {
        return match ($this->condition) {
            'good' => '#4caf50',
            'fair' => '#ff9800',
            'poor' => '#f44336',
            'damaged' => '#f44336',
            'expired' => '#9e9e9e',
            default => '#757575',
        };
    }
}
