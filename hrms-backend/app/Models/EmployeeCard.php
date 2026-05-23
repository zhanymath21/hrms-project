<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeCard extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'card_number',
        'card_type',
        'is_active',
        'issued_date',
        'expiry_date',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'issued_date' => 'date',
        'expiry_date' => 'date',
    ];

    /**
     * Relationship with Employee
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Scope for active cards
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expiry_date')
                    ->orWhere('expiry_date', '>=', now());
            });
    }

    /**
     * Scope for expired cards
     */
    public function scopeExpired($query)
    {
        return $query->where('expiry_date', '<', now());
    }

    /**
     * Check if card is valid
     */
    public function isValid(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->expiry_date && $this->expiry_date < now()) {
            return false;
        }

        return true;
    }

    /**
     * Find employee by card number
     */
    public static function findEmployeeByCard(string $cardNumber): ?Employee
    {
        $card = self::where('card_number', $cardNumber)
            ->active()
            ->first();

        return $card?->employee;
    }

    /**
     * Assign card to employee
     */
    public static function assignCard(int $employeeId, array $data): self
    {
        // Deactivate old cards
        self::where('employee_id', $employeeId)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        // Create new card
        return self::create([
            'employee_id' => $employeeId,
            'card_number' => $data['card_number'],
            'card_type' => $data['card_type'] ?? 'RFID',
            'is_active' => true,
            'issued_date' => $data['issued_date'] ?? now(),
            'expiry_date' => $data['expiry_date'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);
    }
}