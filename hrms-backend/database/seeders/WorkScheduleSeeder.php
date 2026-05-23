<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\WorkSchedule;

class WorkScheduleSeeder extends Seeder
{
    public function run()
    {
        // Cek apakah sudah ada data
        if (WorkSchedule::count() > 0) {
            // Update existing - set first as default
            WorkSchedule::first()->update(['is_default' => true]);
            return;
        }

        $schedules = [
            [
                'name' => 'Morning Shift',
                'code' => 'SHIFT-PAGI',
                'start_time' => '07:00:00',
                'end_time' => '15:00:00',
                'break_start_time' => '12:00:00',
                'break_end_time' => '13:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
                'working_days' => json_encode([1, 2, 3, 4, 5]),
                'is_overnight' => false,
                'is_active' => true,
                'is_default' => true, // DEFAULT
                'description' => 'Morning Shift: 07:00 - 15:00, Break 12:00-13:00',
            ],
            [
                'name' => 'Afternoon Shift',
                'code' => 'SHIFT-SIANG',
                'start_time' => '15:00:00',
                'end_time' => '23:00:00',
                'break_start_time' => '19:00:00',
                'break_end_time' => '20:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
                'working_days' => json_encode([1, 2, 3, 4, 5]),
                'is_overnight' => false,
                'is_active' => true,
                'is_default' => false,
                'description' => 'Afternoon Shift: 15:00 - 23:00, Break 19:00-20:00',
            ],
            [
                'name' => 'Night Shift',
                'code' => 'SHIFT-MALAM',
                'start_time' => '23:00:00',
                'end_time' => '07:00:00',
                'break_start_time' => '03:00:00',
                'break_end_time' => '04:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
                'working_days' => json_encode([1, 2, 3, 4, 5]),
                'is_overnight' => true,
                'is_active' => true,
                'is_default' => false,
                'description' => 'Night Shift: 23:00 - 07:00, Break 03:00-04:00',
            ],
            [
                'name' => 'Full Day Shift',
                'code' => 'SHIFT-FULL',
                'start_time' => '07:00:00',
                'end_time' => '18:00:00',
                'break_start_time' => '12:00:00',
                'break_end_time' => '13:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 10,
                'working_days' => json_encode([1, 2, 3, 4, 5]),
                'is_overnight' => false,
                'is_active' => true,
                'is_default' => false,
                'description' => 'Full Day: 07:00 - 18:00, Break 12:00-13:00',
            ],
        ];

        foreach ($schedules as $schedule) {
            WorkSchedule::create($schedule);
        }
    }
}