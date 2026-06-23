<?php

namespace Database\Factories;

use App\Models\Candidate;
use App\Models\Employee;
use App\Models\Onboarding;
use App\Models\Vacancy;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class OnboardingFactory extends Factory
{
    protected $model = Onboarding::class;

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

        $candidate = Candidate::inRandomOrder()->first();
        $employee = Employee::inRandomOrder()->first();
        $vacancy = Vacancy::inRandomOrder()->first();
        $createdBy = Employee::inRandomOrder()->first();

        $status = $this->faker->randomElement($statuses);
        $progress = $this->getProgressByStatus($status);
        $startDate = $this->faker->dateTimeBetween('-3 months', 'now');
        $expectedEndDate = $this->faker->optional(0.7)->dateTimeBetween($startDate, '+3 months');
        $actualEndDate = ($status === 'onboarding_completed')
            ? $this->faker->dateTimeBetween($startDate, '+2 months')
            : null;

        return [
            'candidate_id' => $candidate?->id,
            'employee_id' => $employee?->id,
            'vacancy_id' => $vacancy?->id,
            'position_title' => $this->generatePositionTitle(),
            'start_date' => $startDate,
            'expected_end_date' => $expectedEndDate,
            'actual_end_date' => $actualEndDate,
            'status' => $status,
            'progress' => $progress,
            'notes' => $this->faker->optional(0.6)->paragraphs(2, true),
            'tasks' => $this->generateTasks($status),
            'created_by' => $createdBy?->id,
            'updated_by' => $createdBy?->id,
            'created_at' => $startDate,
            'updated_at' => $startDate,
        ];
    }

    private function getProgressByStatus($status)
    {
        $progressMap = [
            'pending' => 0,
            'documents_received' => 15,
            'contract_signed' => 25,
            'background_check' => 35,
            'orientation_scheduled' => 50,
            'orientation_completed' => 65,
            'training_started' => 75,
            'training_completed' => 90,
            'onboarding_completed' => 100,
            'cancelled' => 0,
        ];

        return $progressMap[$status] ?? 0;
    }

    private function generatePositionTitle()
    {
        $positions = [
            'Software Engineer',
            'Senior Developer',
            'Frontend Developer',
            'Backend Developer',
            'Full Stack Developer',
            'DevOps Engineer',
            'Data Scientist',
            'Business Analyst',
            'Project Manager',
            'Product Manager',
            'UX/UI Designer',
            'Graphic Designer',
            'Marketing Specialist',
            'Sales Executive',
            'HR Manager',
            'Finance Manager',
            'Accountant',
            'Customer Service Representative',
            'Office Administrator',
            'IT Support Specialist',
        ];

        return $this->faker->randomElement($positions);
    }

    private function generateTasks($status)
    {
        $tasks = [];

        $allTasks = [
            'Submit required documents',
            'Sign employment contract',
            'Complete background check',
            'Schedule orientation',
            'Complete orientation',
            'Set up IT equipment',
            'Create email account',
            'Complete HR paperwork',
            'Attend department meeting',
            'Complete safety training',
            'Complete compliance training',
            'Review employee handbook',
            'Set up payroll',
            'Enroll in benefits',
            'Complete initial training',
            'Meet with team',
            'Receive company ID',
            'Complete security training',
            'Submit tax forms',
            'Complete onboarding survey',
        ];

        // Determine how many tasks based on status
        $numTasks = match ($status) {
            'pending' => rand(2, 4),
            'documents_received' => rand(3, 5),
            'contract_signed' => rand(4, 6),
            'background_check' => rand(4, 6),
            'orientation_scheduled' => rand(5, 7),
            'orientation_completed' => rand(6, 8),
            'training_started' => rand(7, 9),
            'training_completed' => rand(8, 10),
            'onboarding_completed' => 10,
            'cancelled' => rand(1, 3),
            default => rand(3, 6),
        };

        $selectedTasks = $this->faker->randomElements($allTasks, $numTasks);

        foreach ($selectedTasks as $index => $task) {
            $isCompleted = $index < $numTasks * ($this->getProgressByStatus($status) / 100);

            $tasks[] = [
                'task' => $task,
                'completed' => $isCompleted,
                'completed_at' => $isCompleted ? $this->faker->dateTimeBetween('-30 days', 'now') : null,
                'notes' => $this->faker->optional(0.3)->sentence,
            ];
        }

        return $tasks;
    }

    /**
     * Indicate that onboarding is pending.
     */
    public function pending()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'pending',
                'progress' => 0,
                'actual_end_date' => null,
            ];
        });
    }

    /**
     * Indicate that onboarding is in progress.
     */
    public function inProgress()
    {
        return $this->state(function (array $attributes) {
            $statuses = ['documents_received', 'contract_signed', 'background_check', 'orientation_scheduled', 'orientation_completed', 'training_started'];
            $status = $this->faker->randomElement($statuses);
            return [
                'status' => $status,
                'progress' => $this->getProgressByStatus($status),
                'actual_end_date' => null,
            ];
        });
    }

    /**
     * Indicate that onboarding is completed.
     */
    public function completed()
    {
        return $this->state(function (array $attributes) {
            $startDate = $attributes['start_date'] ?? $this->faker->dateTimeBetween('-3 months', 'now');
            return [
                'status' => 'onboarding_completed',
                'progress' => 100,
                'actual_end_date' => $this->faker->dateTimeBetween($startDate, '+2 months'),
                'tasks' => $this->generateTasks('onboarding_completed'),
            ];
        });
    }

    /**
     * Indicate that onboarding is cancelled.
     */
    public function cancelled()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'cancelled',
                'progress' => 0,
                'actual_end_date' => null,
                'notes' => 'Onboarding was cancelled.',
            ];
        });
    }

    /**
     * Set a specific candidate.
     */
    public function forCandidate($candidateId)
    {
        return $this->state(function (array $attributes) use ($candidateId) {
            return [
                'candidate_id' => $candidateId,
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
}
