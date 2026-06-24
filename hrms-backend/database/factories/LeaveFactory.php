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

        // Generate dates correctly
        $startDate = $this->faker->dateTimeBetween('-6 months', '+3 months');

        // Make sure end date is after start date
        $daysToAdd = $this->faker->numberBetween(1, 10);
        $endDate = Carbon::parse($startDate)->addDays($daysToAdd);

        // Calculate total days
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

    public function forLeaveType($leaveTypeId)
    {
        return $this->state(function (array $attributes) use ($leaveTypeId) {
            return [
                'leave_type_id' => $leaveTypeId,
            ];
        });
    }

    public function forEmployee($employeeId)
    {
        return $this->state(function (array $attributes) use ($employeeId) {
            return [
                'employee_id' => $employeeId,
            ];
        });
    }

    public function betweenDates($startDate, $endDate)
    {
        return $this->state(function (array $attributes) use ($startDate, $endDate) {
            // Validate and calculate days
            $start = Carbon::parse($startDate);
            $end = Carbon::parse($endDate);

            // If end date is before start date, swap them
            if ($end < $start) {
                $temp = $start;
                $start = $end;
                $end = $temp;
            }

            $totalDays = $start->diffInDays($end) + 1;

            return [
                'start_date' => $start,
                'end_date' => $end,
                'total_days' => $totalDays,
            ];
        });
    }
}
