<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Vacancy;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class VacancyFactory extends Factory
{
    protected $model = Vacancy::class;

    public function definition()
    {
        $statuses = ['open', 'closed', 'on_hold'];
        $status = $this->faker->randomElement($statuses);

        // Get existing department or create one
        $departmentId = Department::inRandomOrder()->first()?->id ?? null;

        $postedDate = $this->faker->dateTimeBetween('-90 days', 'now');
        $closingDate = $this->faker->optional(0.7)->dateTimeBetween($postedDate, '+60 days');

        // If status is closed, make sure closing date is in the past
        if ($status === 'closed' && $closingDate) {
            $closingDate = $this->faker->dateTimeBetween($postedDate, 'now');
        }

        return [
            'title' => $this->faker->randomElement([
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
                'Network Administrator',
                'Database Administrator',
                'Security Analyst',
                'Cloud Architect',
                'Mobile Developer',
                'QA Engineer',
                'Scrum Master',
                'Technical Writer',
                'Systems Analyst',
                'ERP Consultant',
            ]),
            'department_id' => $departmentId,
            'description' => $this->faker->optional(0.9)->paragraphs(3, true),
            'requirements' => $this->faker->optional(0.9)->paragraphs(2, true),
            'location' => $this->faker->randomElement([
                'Phnom Penh',
                'Siem Reap',
                'Battambang',
                'Sihanoukville',
                'Kampong Cham',
                'Takeo',
                'Kampot',
                'Kandal',
                'Pursat',
                'Remote',
                'Hybrid - Phnom Penh',
                'Hybrid - Siem Reap',
            ]),
            'salary_min' => $this->faker->numberBetween(800000, 2500000),
            'salary_max' => function (array $attributes) {
                return $attributes['salary_min'] + $this->faker->numberBetween(500000, 2000000);
            },
            'status' => $status,
            'applicants_count' => $this->faker->numberBetween(0, 50),
            'posted_date' => $postedDate,
            'closing_date' => $closingDate,
            'created_at' => $postedDate,
            'updated_at' => $postedDate,
        ];
    }

    /**
     * Indicate that the vacancy is open.
     */
    public function open()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'open',
                'closing_date' => $this->faker->dateTimeBetween('+1 week', '+60 days'),
            ];
        });
    }

    /**
     * Indicate that the vacancy is closed.
     */
    public function closed()
    {
        return $this->state(function (array $attributes) {
            $postedDate = $attributes['posted_date'] ?? $this->faker->dateTimeBetween('-90 days', '-30 days');
            return [
                'status' => 'closed',
                'closing_date' => $this->faker->dateTimeBetween($postedDate, 'now'),
            ];
        });
    }

    /**
     * Indicate that the vacancy is on hold.
     */
    public function onHold()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'on_hold',
                'closing_date' => $this->faker->optional(0.5)->dateTimeBetween('+1 week', '+90 days'),
            ];
        });
    }

    /**
     * Configure the vacancy with a specific department.
     */
    public function forDepartment($departmentId)
    {
        return $this->state(function (array $attributes) use ($departmentId) {
            return [
                'department_id' => $departmentId,
            ];
        });
    }
}
