<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\LostTimeInjury;
use App\Models\LostTimeInjuryHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

class LostTimeInjuryHistoryFactory extends Factory
{
    protected $model = LostTimeInjuryHistory::class;

    public function definition()
    {
        $statuses = ['reported', 'under_investigation', 'in_review', 'resolved', 'closed', 'rejected'];
        $approvalStatuses = ['pending', 'in_progress', 'approved', 'rejected', 'partially_approved'];

        $oldStatus = $this->faker->randomElement($statuses);
        $newStatus = $this->faker->randomElement($statuses);

        while ($newStatus === $oldStatus) {
            $newStatus = $this->faker->randomElement($statuses);
        }

        return [
            'lost_time_injury_id' => LostTimeInjury::factory(),
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'old_approval_status' => $this->faker->randomElement($approvalStatuses),
            'new_approval_status' => $this->faker->randomElement($approvalStatuses),
            'old_days_lost' => $this->faker->optional(0.3)->numberBetween(0, 30),
            'new_days_lost' => $this->faker->optional(0.3)->numberBetween(0, 90),
            'notes' => $this->faker->optional(0.5)->sentence,
            'updated_by' => Employee::inRandomOrder()->first()?->id,
            'created_at' => $this->faker->dateTimeBetween('-60 days', 'now'),
            'updated_at' => now(),
        ];
    }

    /**
     * Set a specific status change.
     */
    public function statusChange($oldStatus, $newStatus)
    {
        return $this->state(function (array $attributes) use ($oldStatus, $newStatus) {
            return [
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ];
        });
    }

    /**
     * Set days lost change.
     */
    public function daysLostChange($oldDays, $newDays)
    {
        return $this->state(function (array $attributes) use ($oldDays, $newDays) {
            return [
                'old_days_lost' => $oldDays,
                'new_days_lost' => $newDays,
            ];
        });
    }
}
