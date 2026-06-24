<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\WorkSchedule;
use App\Models\EmployeeSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class EmployeeScheduleFactory extends Factory
{
    protected $model = EmployeeSchedule::class;

    public function definition()
    {
        $employee = Employee::inRandomOrder()->first();
        $workSchedule = WorkSchedule::inRandomOrder()->first();

        $startDate = $this->faker->dateTimeBetween('-3 months', 'now');
        $endDate = $this->faker->optional(0.3)->dateTimeBetween($startDate, '+6 months');

        return [
            'employee_id' => $employee?->id,
            'work_schedule_id' => $workSchedule?->id ?? 1,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'is_active' => true,
            'notes' => $this->faker->optional(0.3)->sentence,
            'created_at' => $startDate,
            'updated_at' => $startDate,
        ];
    }

    /**
     * Set active schedule.
     */
    public function active()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => true,
                'end_date' => null,
            ];
        });
    }

    /**
     * Set expired schedule.
     */
    public function expired()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => false,
                'end_date' => $this->faker->dateTimeBetween('-3 months', '-1 day'),
            ];
        });
    }

    /**
     * For specific employee.
     */
    public function forEmployee($employeeId)
    {
        return $this->state(function (array $attributes) use ($employeeId) {
            return [
                'employee_id' => $employeeId,
            ];
        });
    }
}
