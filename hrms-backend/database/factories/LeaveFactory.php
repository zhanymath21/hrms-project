<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class LeaveFactory extends Factory
{
    protected $model = Leave::class;

    public function definition()
    {
        $employee = Employee::inRandomOrder()->first();
        $leaveType = LeaveType::inRandomOrder()->first();

        $statuses = ['pending', 'approved', 'rejected', 'cancelled'];
        $status = $this->faker->randomElement($statuses);

        $startDate = $this->faker->dateTimeBetween('-6 months', '+3 months');
        $endDate = Carbon::parse($startDate)->addDays($this->faker->numberBetween(1, 10));
        $totalDays = Carbon::parse($startDate)->diffInDays($endDate) + 1;

        $approvedBy = $status === 'approved' ? Employee::inRandomOrder()->first()?->id : null;
        $approvedAt = $status === 'approved' ? $this->faker->dateTimeBetween($startDate, 'now') : null;

        $cancelledBy = $status === 'cancelled' ? Employee::inRandomOrder()->first()?->id : null;
        $cancelledAt = $status === 'cancelled' ? $this->faker->dateTimeBetween($startDate, 'now') : null;

        return [
            'employee_id' => $employee?->id,
            'leave_type_id' => $leaveType?->id ?? 1,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_days' => $totalDays,
            'reason' => $this->faker->paragraphs(2, true),
            'status' => $status,
            'approved_by' => $approvedBy,
            'approved_at' => $approvedAt,
            'rejection_reason' => $status === 'rejected' ? $this->faker->sentence : null,
            'cancelled_at' => $cancelledAt,
            'cancelled_by' => $cancelledBy,
            'created_at' => $startDate,
            'updated_at' => $startDate,
        ];
    }

    /**
     * Indicate that the leave is pending.
     */
    public function pending()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'pending',
                'approved_by' => null,
                'approved_at' => null,
                'rejection_reason' => null,
                'cancelled_at' => null,
                'cancelled_by' => null,
            ];
        });
    }

    /**
     * Indicate that the leave is approved.
     */
    public function approved()
    {
        return $this->state(function (array $attributes) {
            $approvedBy = Employee::inRandomOrder()->first();
            return [
                'status' => 'approved',
                'approved_by' => $approvedBy?->id,
                'approved_at' => now(),
                'rejection_reason' => null,
            ];
        });
    }

    /**
     * Indicate that the leave is rejected.
     */
    public function rejected()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'rejected',
                'approved_by' => null,
                'approved_at' => null,
                'rejection_reason' => $this->faker->sentence,
            ];
        });
    }

    /**
     * Indicate that the leave is cancelled.
     */
    public function cancelled()
    {
        return $this->state(function (array $attributes) {
            $cancelledBy = Employee::inRandomOrder()->first();
            return [
                'status' => 'cancelled',
                'approved_by' => null,
                'approved_at' => null,
                'cancelled_at' => now(),
                'cancelled_by' => $cancelledBy?->id,
            ];
        });
    }

    /**
     * Set a specific leave type.
     */
    public function forLeaveType($leaveTypeId)
    {
        return $this->state(function (array $attributes) use ($leaveTypeId) {
            return [
                'leave_type_id' => $leaveTypeId,
            ];
        });
    }

    /**
     * Set a specific employee.
     */
    public function forEmployee($employeeId)
    {
        return $this->state(function (array $attributes) use ($employeeId) {
            return [
                'employee_id' => $employeeId,
            ];
        });
    }

    /**
     * Set specific date range.
     */
    public function betweenDates($startDate, $endDate)
    {
        return $this->state(function (array $attributes) use ($startDate, $endDate) {
            $totalDays = Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate)) + 1;
            return [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'total_days' => $totalDays,
            ];
        });
    }
}
