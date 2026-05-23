<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class CacheService
{
    private static $defaultTTL = 300; // 5 menit

    /**
     * Remember data in cache
     */
    public static function remember(string $key, callable $callback, int $minutes = null): mixed
    {
        $ttl = $minutes ?? self::$defaultTTL;
        return Cache::remember($key, now()->addMinutes($ttl), $callback);
    }

    /**
     * Clear all HRMS cache
     */
    public static function clearAll(): void
    {
        Cache::tags(['hrms'])->flush();
    }

    /**
     * Clear employee related cache
     */
    public static function clearEmployee(int $employeeId): void
    {
        Cache::forget("employee_{$employeeId}_balance");
        Cache::forget("employee_{$employeeId}_schedule");
    }

    /**
     * Clear attendance cache
     */
    public static function clearAttendance(): void
    {
        $keys = ['attendance_today_summary', 'attendance_monthly_summary'];
        foreach ($keys as $key) {
            Cache::forget($key);
        }
    }
}
