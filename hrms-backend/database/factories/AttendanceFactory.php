<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Attendance;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class AttendanceFactory extends Factory
{
    protected $model = Attendance::class;

    public function definition()
    {
        $employee = Employee::inRandomOrder()->first();
        $date = $this->faker->dateTimeBetween('-3 months', 'now');

        $statuses = ['present', 'absent', 'late', 'half_day', 'holiday', 'weekend', 'sick', 'permission'];
        $status = $this->faker->randomElement($statuses);

        $totalHours = match ($status) {
            'present' => $this->faker->numberBetween(7, 9),
            'late' => $this->faker->numberBetween(6, 8),
            'half_day' => $this->faker->numberBetween(3, 5),
            'sick', 'permission' => $this->faker->numberBetween(2, 6),
            default => 0,
        };

        $overtimeHours = $this->faker->optional(0.2)->numberBetween(1, 4);
        $totalSessions = $status === 'present' || $status === 'late' ? $this->faker->numberBetween(1, 2) : 0;

        $isApproved = $this->faker->boolean(70);
        $approvedBy = $isApproved ? Employee::inRandomOrder()->first()?->id : null;

        return [
            'employee_id' => $employee?->id,
            'date' => $date,
            'status' => $status,
            'total_hours' => $totalHours,
            'overtime_hours' => $overtimeHours,
            'total_sessions' => $totalSessions,
            'first_check_in' => $status === 'present' || $status === 'late' ? $this->faker->time('H:i:s') : null,
            'last_check_out' => $status === 'present' || $status === 'late' ? $this->faker->time('H:i:s') : null,
            'is_approved' => $isApproved,
            'approved_by' => $approvedBy,
            'remarks' => $this->faker->optional(0.3)->sentence,
            'created_at' => $date,
            'updated_at' => $date,
        ];
    }

    /**
     * Indicate that employee is present.
     */
    public function present()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'present',
                'total_hours' => $this->faker->numberBetween(7, 9),
            ];
        });
    }

    /**
     * Indicate that employee is absent.
     */
    public function absent()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'absent',
                'total_hours' => 0,
                'overtime_hours' => 0,
                'total_sessions' => 0,
                'first_check_in' => null,
                'last_check_out' => null,
            ];
        });
    }

    /**
     * Indicate that employee is late.
     */
    public function late()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'late',
                'total_hours' => $this->faker->numberBetween(6, 7),
                'first_check_in' => $this->faker->time('H:i:s'),
            ];
        });
    }

    /**
     * For a specific date.
     */
    public function onDate($date)
    {
        return $this->state(function (array $attributes) use ($date) {
            return [
                'date' => $date,
            ];
        });
    }
}
