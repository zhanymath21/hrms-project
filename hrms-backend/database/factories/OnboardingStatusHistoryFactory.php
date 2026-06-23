<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Onboarding;
use App\Models\OnboardingStatusHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

class OnboardingStatusHistoryFactory extends Factory
{
    protected $model = OnboardingStatusHistory::class;

    public function definition()
    {
        $statuses = [
            'pending',
            'documents_received',
            'contract_signed',
            'background_check',
            'orientation_scheduled',
            'orientation_completed',
            'training_started',
            'training_completed',
            'onboarding_completed',
            'cancelled'
        ];

        $oldStatus = $this->faker->randomElement($statuses);
        $newStatus = $this->faker->randomElement($statuses);

        // Make sure new status is different
        while ($newStatus === $oldStatus) {
            $newStatus = $this->faker->randomElement($statuses);
        }

        $oldProgress = $this->faker->numberBetween(0, 100);
        $newProgress = $this->faker->numberBetween(0, 100);

        // Make sure new progress is higher than old progress (progress should increase)
        while ($newProgress <= $oldProgress) {
            $newProgress = $this->faker->numberBetween($oldProgress + 1, 100);
        }

        return [
            'onboarding_id' => Onboarding::factory(),
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'old_progress' => $oldProgress,
            'new_progress' => $newProgress,
            'notes' => $this->generateStatusChangeNotes($newStatus),
            'updated_by' => Employee::inRandomOrder()->first()?->id,
            'created_at' => $this->faker->dateTimeBetween('-60 days', 'now'),
            'updated_at' => now(),
        ];
    }

    private function generateStatusChangeNotes($status)
    {
        $notes = [
            'pending' => ['Onboarding process started', 'Initial onboarding request created'],
            'documents_received' => ['All required documents received', 'Documents verified and approved'],
            'contract_signed' => ['Employment contract signed', 'Contract finalized'],
            'background_check' => ['Background check initiated', 'Background check completed'],
            'orientation_scheduled' => ['Orientation scheduled', 'Orientation date confirmed'],
            'orientation_completed' => ['Orientation completed successfully', 'New hire orientation done'],
            'training_started' => ['Training program started', 'Initial training completed'],
            'training_completed' => ['All training modules completed', 'Training certification issued'],
            'onboarding_completed' => ['Onboarding process completed', 'New hire fully onboarded'],
            'cancelled' => ['Onboarding cancelled', 'Process terminated'],
        ];

        $statusNotes = $notes[$status] ?? ['Status updated'];
        return $statusNotes[array_rand($statusNotes)];
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
     * Set a specific progress change.
     */
    public function progressChange($oldProgress, $newProgress)
    {
        return $this->state(function (array $attributes) use ($oldProgress, $newProgress) {
            return [
                'old_progress' => $oldProgress,
                'new_progress' => $newProgress,
            ];
        });
    }

    /**
     * Indicate that progress was increased.
     */
    public function progressIncreased($amount = 10)
    {
        return $this->state(function (array $attributes) use ($amount) {
            $oldProgress = $this->faker->numberBetween(0, 90);
            return [
                'old_progress' => $oldProgress,
                'new_progress' => $oldProgress + $amount,
            ];
        });
    }

    /**
     * Indicate that onboarding was completed.
     */
    public function completed()
    {
        return $this->state(function (array $attributes) {
            return [
                'old_status' => 'training_completed',
                'new_status' => 'onboarding_completed',
                'old_progress' => 90,
                'new_progress' => 100,
                'notes' => 'Onboarding process completed successfully!',
            ];
        });
    }

    /**
     * Indicate that onboarding was cancelled.
     */
    public function cancelled()
    {
        return $this->state(function (array $attributes) {
            return [
                'old_status' => $this->faker->randomElement(['pending', 'documents_received', 'background_check']),
                'new_status' => 'cancelled',
                'notes' => 'Onboarding process cancelled.',
            ];
        });
    }
}
