<?php
// app/Services/CacheService.php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

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
     * Remember data in cache forever
     */
    public static function rememberForever(string $key, callable $callback): mixed
    {
        return Cache::rememberForever($key, $callback);
    }

    /**
     * Get cached data
     */
    public static function get(string $key): mixed
    {
        return Cache::get($key);
    }

    /**
     * Store data in cache
     */
    public static function put(string $key, $value, int $minutes = null): bool
    {
        $ttl = $minutes ?? self::$defaultTTL;
        return Cache::put($key, $value, now()->addMinutes($ttl));
    }

    /**
     * Check if cache key exists
     */
    public static function has(string $key): bool
    {
        return Cache::has($key);
    }

    /**
     * Forget specific cache key
     */
    public static function forget(string $key): void
    {
        Cache::forget($key);
        Log::info('🗑️ Cache cleared: ' . $key);
    }

    /**
     * Clear all HRMS cache
     */
    public static function clearAll(): void
    {
        Cache::flush();
        Log::info('🗑️ All cache cleared');
    }

    /**
     * Clear cache by pattern (using Redis)
     */
    public static function clearPattern(string $pattern): void
    {
        try {
            $redis = Cache::getRedis();

            // Get all keys matching pattern
            $keys = $redis->keys($pattern);

            if (empty($keys)) {
                Log::info('🗑️ No cache keys found for pattern: ' . $pattern);
                return;
            }

            foreach ($keys as $key) {
                Cache::forget($key);
            }

            Log::info('🗑️ Cache cleared by pattern: ' . $pattern . ' (' . count($keys) . ' keys)');
        } catch (\Exception $e) {
            Log::warning('Failed to clear cache by pattern: ' . $e->getMessage());

            // Fallback: clear specific keys that match pattern
            $this->clearKnownPatterns($pattern);
        }
    }

    /**
     * Clear known cache patterns (fallback)
     */
    private static function clearKnownPatterns(string $pattern): void
    {
        if (str_contains($pattern, 'employees_list')) {
            self::clearEmployeesList();
        }
        if (str_contains($pattern, 'employee_')) {
            self::clearEmployeeCache();
        }
        if (str_contains($pattern, 'departments')) {
            self::clearDepartments();
        }
        if (str_contains($pattern, 'positions')) {
            self::clearPositions();
        }
    }

    /**
     * Clear employee related cache
     */
    public static function clearEmployee(int $employeeId): void
    {
        Cache::forget("employee_{$employeeId}_balance");
        Cache::forget("employee_{$employeeId}_schedule");
        Cache::forget("employee_{$employeeId}_details");
        Cache::forget("employee_{$employeeId}");

        // Clear employee list cache
        self::clearEmployeesList();

        Log::info('🗑️ Employee cache cleared for ID: ' . $employeeId);
    }

    /**
     * Clear employees list cache
     */
    public static function clearEmployeesList(): void
    {
        // Clear all employees list variations
        $patterns = [
            'employees_list_*',
            'employees_list_*_*',
        ];

        foreach ($patterns as $pattern) {
            self::clearPattern($pattern);
        }

        // Also clear specific keys
        Cache::forget('employees_list');
        Cache::forget('employees_stats');
        Cache::forget('employees_total');

        Log::info('🗑️ Employees list cache cleared');
    }

    /**
     * Clear employee cache (all employees)
     */
    public static function clearEmployeeCache(): void
    {
        self::clearEmployeesList();

        // Clear stats
        Cache::forget('employees_stats');

        Log::info('🗑️ All employee cache cleared');
    }

    /**
     * Clear departments cache
     */
    public static function clearDepartments(): void
    {
        Cache::forget('departments_all');
        Cache::forget('departments_with_positions');
        Cache::forget('departments_list');

        Log::info('🗑️ Departments cache cleared');
    }

    /**
     * Clear positions cache
     */
    public static function clearPositions(): void
    {
        Cache::forget('positions_all');
        Cache::forget('positions_with_departments');

        // Clear positions by department pattern
        self::clearPattern('positions_*');

        Log::info('🗑️ Positions cache cleared');
    }

    /**
     * Clear attendance cache
     */
    public static function clearAttendance(): void
    {
        $keys = [
            'attendance_today_summary',
            'attendance_monthly_summary',
            'attendance_weekly_summary',
            'attendance_daily_*',
            'attendance_employee_*',
        ];

        foreach ($keys as $key) {
            if (str_contains($key, '*')) {
                self::clearPattern($key);
            } else {
                Cache::forget($key);
            }
        }

        Log::info('🗑️ Attendance cache cleared');
    }

    /**
     * Clear leave cache
     */
    public static function clearLeave(): void
    {
        $keys = [
            'leave_balances_*',
            'leave_requests_*',
            'leave_summary_*',
        ];

        foreach ($keys as $key) {
            self::clearPattern($key);
        }

        Log::info('🗑️ Leave cache cleared');
    }

    /**
     * Clear all HRMS related cache
     */
    public static function clearHRMS(): void
    {
        self::clearEmployeesList();
        self::clearDepartments();
        self::clearPositions();
        self::clearAttendance();
        self::clearLeave();

        // Clear any remaining HRMS cache
        self::clearPattern('hrms_*');

        Log::info('🗑️ All HRMS cache cleared');
    }

    /**
     * Get cache keys by pattern (for debugging)
     */
    public static function getKeysByPattern(string $pattern): array
    {
        try {
            $redis = Cache::getRedis();
            return $redis->keys($pattern) ?? [];
        } catch (\Exception $e) {
            Log::warning('Failed to get cache keys by pattern: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get cache size (for debugging)
     */
    public static function getCacheSize(): int
    {
        try {
            $redis = Cache::getRedis();
            $keys = $redis->keys('*');
            return count($keys);
        } catch (\Exception $e) {
            return 0;
        }
    }
}
