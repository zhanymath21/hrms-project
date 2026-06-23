<?php

namespace Database\Factories;

use App\Models\Candidate;
use Illuminate\Database\Eloquent\Factories\Factory;

class CandidateFactory extends Factory
{
    protected $model = Candidate::class;

    public function definition()
    {
        // Statuses that match your migration
        $statuses = [
            'new',
            'screening',
            'interview',
            'technical_test',
            'hr_interview',
            'offered',
            'hired',
            'rejected',
            'withdrawn'
        ];

        return [
            'first_name' => $this->faker->firstName,
            'last_name' => $this->faker->lastName,
            'email' => $this->faker->unique()->safeEmail,
            'phone' => $this->generateCambodianPhoneNumber(),
            'position_applied' => $this->faker->randomElement([
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
            ]),
            'experience_years' => $this->faker->numberBetween(0, 15),
            'current_salary' => $this->faker->optional(0.7, 0)->numberBetween(800000, 4000000),
            'expected_salary' => $this->faker->numberBetween(1000000, 5000000),
            'location' => $this->faker->randomElement([
                'Phnom Penh',
                'Siem Reap',
                'Battambang',
                'Sihanoukville',
                'Kampong Cham',
                'Takeo',
                'Kampot',
            ]),
            'status' => $this->faker->randomElement($statuses),
            'notes' => $this->faker->optional(0.6)->paragraph,
            'cv_file_name' => $this->faker->optional(0.8)->word . '_cv.pdf',
            'cv_file_path' => $this->faker->optional(0.8)->filePath,
            'cv_file_type' => $this->faker->optional(0.8)->randomElement(['application/pdf', 'application/msword']),
            'cv_file_size' => $this->faker->optional(0.8)->numberBetween(100000, 5000000),
            'cv_url' => $this->faker->optional(0.3)->url,
            'created_at' => $this->faker->dateTimeBetween('-90 days', 'now'),
            'updated_at' => function (array $attributes) {
                return $attributes['created_at'];
            },
        ];
    }

    private function generateCambodianPhoneNumber()
    {
        $prefixes = ['010', '011', '012', '015', '016', '017', '069', '070', '077', '078', '081', '085', '086', '088', '089', '092', '093', '095', '096', '097', '098', '099'];
        $prefix = $this->faker->randomElement($prefixes);
        $number = $this->faker->numberBetween(1000000, 9999999);
        return $prefix . $number;
    }
}
