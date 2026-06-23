<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExchangeRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'from_currency',
        'to_currency',
        'rate',
        'effective_date',
        'is_active',
        'notes',
        'updated_by',
    ];

    protected $casts = [
        'rate' => 'decimal:4',
        'effective_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function updatedBy()
    {
        return $this->belongsTo(Employee::class, 'updated_by');
    }

    // Get active exchange rate
    public static function getActive($from = 'USD', $to = 'KHR')
    {
        return self::where('from_currency', $from)
            ->where('to_currency', $to)
            ->where('is_active', true)
            ->whereDate('effective_date', '<=', now())
            ->orderBy('effective_date', 'desc')
            ->first();
    }

    // Get rate for specific date
    public static function getRateForDate($date, $from = 'USD', $to = 'KHR')
    {
        return self::where('from_currency', $from)
            ->where('to_currency', $to)
            ->whereDate('effective_date', '<=', $date)
            ->orderBy('effective_date', 'desc')
            ->first();
    }

    // Convert currency
    public static function convert($amount, $from, $to, $date = null)
    {
        if ($from === $to) {
            return $amount;
        }

        $date = $date ?? now();
        $rate = self::getRateForDate($date, $from, $to);

        if (!$rate) {
            return $amount;
        }

        return $amount * $rate->rate;
    }

    // Format currency with symbol
    public static function format($amount, $currency = 'KHR')
    {
        $symbols = [
            'USD' => '$',
            'KHR' => '៛',
        ];

        $symbol = $symbols[$currency] ?? $currency;

        if ($currency === 'USD') {
            return $symbol . number_format($amount, 2);
        }

        return $symbol . number_format($amount, 0);
    }
}
