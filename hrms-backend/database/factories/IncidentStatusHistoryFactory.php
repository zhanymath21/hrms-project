<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\IncidentReport;
use App\Models\IncidentStatusHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

class IncidentStatusHistoryFactory extends Factory
{
    protected $model = IncidentStatusHistory::class;

    public function definition()
    {
        $statuses = ['reported', 'under_investigation', 'in_review', 'resolved', 'closed', 'rejected'];
        $approvalStatuses = ['pending', 'in_progress', 'approved', 'rejected', 'partially_approved'];

        $oldStatus = $this->faker->randomElement($statuses);
        $newStatus = $this->faker->randomElement($statuses);

        // Make sure new status is different
        while ($newStatus === $oldStatus) {
            $newStatus = $this->faker->randomElement($statuses);
        }

        return [
            'incident_report_id' => IncidentReport::factory(),
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'old_approval_status' => $this->faker->randomElement($approvalStatuses),
            'new_approval_status' => $this->faker->randomElement($approvalStatuses),
            'old_progress' => $this->faker->optional(0.3)->numberBetween(0, 100),
            'new_progress' => $this->faker->optional(0.3)->numberBetween(0, 100),
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
     * Set a specific approval status change.
     */
    public function approvalStatusChange($oldStatus, $newStatus)
    {
        return $this->state(function (array $attributes) use ($oldStatus, $newStatus) {
            return [
                'old_approval_status' => $oldStatus,
                'new_approval_status' => $newStatus,
            ];
        });
    }
}
