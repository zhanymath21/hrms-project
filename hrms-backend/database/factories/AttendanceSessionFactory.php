<?php

namespace Database\Factories;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\WorkSchedule;
use App\Models\AttendanceSession;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class AttendanceSessionFactory extends Factory
{
    protected $model = AttendanceSession::class;

    public function definition()
    {
        $attendance = Attendance::inRandomOrder()->first();
        $employee = $attendance?->employee ?? Employee::inRandomOrder()->first();
        $workSchedule = WorkSchedule::inRandomOrder()->first();

        $date = $attendance?->date ?? $this->faker->dateTimeBetween('-3 months', 'now');
        $sessionNumber = $this->faker->numberBetween(1, 4);

        $checkInTime = $this->faker->time('H:i:s');
        $checkOutTime = $this->faker->time('H:i:s');

        // Make sure check out is after check in
        while ($checkOutTime <= $checkInTime) {
            $checkOutTime = $this->faker->time('H:i:s');
        }

        $sessionHours = Carbon::parse($checkInTime)->diffInHours(Carbon::parse($checkOutTime));

        $scheduleStartTime = $workSchedule?->start_time ?? '08:00:00';
        $scheduleEndTime = $workSchedule?->end_time ?? '17:00:00';

        $isLate = $checkInTime > $scheduleStartTime;
        $lateMinutes = $isLate ? Carbon::parse($scheduleStartTime)->diffInMinutes(Carbon::parse($checkInTime)) : 0;

        $isEarlyLeave = $checkOutTime < $scheduleEndTime;
        $earlyLeaveMinutes = $isEarlyLeave ? Carbon::parse($checkOutTime)->diffInMinutes(Carbon::parse($scheduleEndTime)) : 0;

        $statuses = ['ongoing', 'completed', 'cancelled'];
        $status = $this->faker->randomElement($statuses);

        return [
            'attendance_id' => $attendance?->id,
            'employee_id' => $employee?->id,
            'work_schedule_id' => $workSchedule?->id,
            'date' => $date,
            'session_number' => $sessionNumber,
            'check_in_time' => $checkInTime,
            'check_out_time' => $status === 'completed' ? $checkOutTime : null,
            'session_hours' => $status === 'completed' ? $sessionHours : 0,
            'schedule_start_time' => $scheduleStartTime,
            'schedule_end_time' => $scheduleEndTime,
            'is_late' => $isLate,
            'late_minutes' => $lateMinutes,
            'is_early_leave' => $isEarlyLeave,
            'early_leave_minutes' => $earlyLeaveMinutes,
            'check_in_location' => $this->faker->optional(0.3)->address,
            'check_out_location' => $this->faker->optional(0.3)->address,
            'check_in_ip' => $this->faker->optional(0.3)->ipv4,
            'check_out_ip' => $this->faker->optional(0.3)->ipv4,
            'status' => $status,
            'notes' => $this->faker->optional(0.3)->sentence,
            'created_at' => $date,
            'updated_at' => $date,
        ];
    }

    /**
     * Indicate that the session is completed.
     */
    public function completed()
    {
        return $this->state(function (array $attributes) {
            $checkInTime = $this->faker->time('H:i:s');
            $checkOutTime = $this->faker->time('H:i:s');
            while ($checkOutTime <= $checkInTime) {
                $checkOutTime = $this->faker->time('H:i:s');
            }
            $sessionHours = Carbon::parse($checkInTime)->diffInHours(Carbon::parse($checkOutTime));

            return [
                'status' => 'completed',
                'check_out_time' => $checkOutTime,
                'session_hours' => $sessionHours,
            ];
        });
    }

    /**
     * Indicate that the session is ongoing.
     */
    public function ongoing()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'ongoing',
                'check_out_time' => null,
                'session_hours' => 0,
            ];
        });
    }
}
