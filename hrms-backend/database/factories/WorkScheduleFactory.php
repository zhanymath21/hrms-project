<?php

namespace Database\Factories;

use App\Models\WorkSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkScheduleFactory extends Factory
{
    protected $model = WorkSchedule::class;

    public function definition()
    {
        $shifts = [
            [
                'name' => 'Morning Shift',
                'code' => 'SHIFT-PAGI',
                'start_time' => '08:00:00',
                'end_time' => '17:00:00',
                'break_start_time' => '12:00:00',
                'break_end_time' => '13:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
                'is_overnight' => false,
            ],
            [
                'name' => 'Afternoon Shift',
                'code' => 'SHIFT-SORE',
                'start_time' => '13:00:00',
                'end_time' => '22:00:00',
                'break_start_time' => '17:00:00',
                'break_end_time' => '18:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
                'is_overnight' => false,
            ],
            [
                'name' => 'Night Shift',
                'code' => 'SHIFT-MALAM',
                'start_time' => '22:00:00',
                'end_time' => '07:00:00',
                'break_start_time' => '02:00:00',
                'break_end_time' => '03:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
                'is_overnight' => true,
            ],
            [
                'name' => 'Flexible Shift',
                'code' => 'SHIFT-FLEKSI',
                'start_time' => '09:00:00',
                'end_time' => '18:00:00',
                'break_start_time' => '13:00:00',
                'break_end_time' => '14:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
                'is_overnight' => false,
            ],
            [
                'name' => 'Part Time Morning',
                'code' => 'SHIFT-PARUH-PAGI',
                'start_time' => '08:00:00',
                'end_time' => '12:00:00',
                'break_start_time' => null,
                'break_end_time' => null,
                'break_duration_minutes' => 0,
                'total_working_hours' => 4,
                'is_overnight' => false,
            ],
            [
                'name' => 'Part Time Afternoon',
                'code' => 'SHIFT-PARUH-SORE',
                'start_time' => '13:00:00',
                'end_time' => '17:00:00',
                'break_start_time' => null,
                'break_end_time' => null,
                'break_duration_minutes' => 0,
                'total_working_hours' => 4,
                'is_overnight' => false,
            ],
        ];

        $shift = $this->faker->randomElement($shifts);

        return [
            'name' => $shift['name'],
            'code' => $shift['code'],
            'start_time' => $shift['start_time'],
            'end_time' => $shift['end_time'],
            'break_start_time' => $shift['break_start_time'],
            'break_end_time' => $shift['break_end_time'],
            'break_duration_minutes' => $shift['break_duration_minutes'],
            'total_working_hours' => $shift['total_working_hours'],
            'working_days' => [1, 2, 3, 4, 5], // Monday to Friday
            'is_overnight' => $shift['is_overnight'],
            'is_active' => true,
            'description' => $this->faker->optional(0.5)->sentence,
        ];
    }

    /**
     * Indicate that the schedule is active.
     */
    public function active()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => true,
            ];
        });
    }

    /**
     * Indicate that the schedule is inactive.
     */
    public function inactive()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => false,
            ];
        });
    }

    /**
     * Set as overnight shift.
     */
    public function overnight()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_overnight' => true,
                'start_time' => '22:00:00',
                'end_time' => '07:00:00',
                'break_start_time' => '02:00:00',
                'break_end_time' => '03:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
            ];
        });
    }
}
