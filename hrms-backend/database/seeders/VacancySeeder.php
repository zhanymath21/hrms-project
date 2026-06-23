<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vacancy;
use App\Models\Department;
use Carbon\Carbon;

class VacancySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run()
    {
        $this->command->info('📝 Creating vacancies...');

        // Get departments
        $departments = Department::all();

        if ($departments->isEmpty()) {
            $this->command->warn('⚠️ No departments found. Creating vacancies without department...');
        }

        // Create 30 vacancies using factory
        Vacancy::factory(30)
            ->create()
            ->each(function ($vacancy) {
                // Update applicants_count randomly
                $vacancy->update([
                    'applicants_count' => $this->getRandomApplicants($vacancy->status)
                ]);
            });

        // Create specific vacancies with different statuses
        $this->createSpecificVacancies($departments);

        $this->command->info('✅ ' . Vacancy::count() . ' vacancies created');
        $this->displaySummary();
    }

    /**
     * Create specific vacancies for demo purposes
     */
    private function createSpecificVacancies($departments)
    {
        $specificVacancies = [
            [
                'title' => 'Senior Software Engineer',
                'department' => 'IT',
                'description' => 'We are looking for an experienced Senior Software Engineer to lead our development team. The ideal candidate will have strong experience in PHP, Laravel, and modern JavaScript frameworks.',
                'requirements' => "• 5+ years of experience in software development\n• Strong knowledge of PHP and Laravel\n• Experience with Vue.js or React\n• Good understanding of database design\n• Excellent problem-solving skills",
                'location' => 'Phnom Penh',
                'salary_min' => 3000000,
                'salary_max' => 5000000,
                'status' => 'open',
                'posted_date' => Carbon::now()->subDays(5),
                'closing_date' => Carbon::now()->addDays(25),
            ],
            [
                'title' => 'UX/UI Designer',
                'department' => 'Design',
                'description' => 'Join our creative team as a UX/UI Designer. You will be responsible for designing user-friendly interfaces for our web and mobile applications.',
                'requirements' => "• 3+ years of experience in UX/UI design\n• Proficiency in Figma, Adobe XD, or Sketch\n• Strong portfolio demonstrating design skills\n• Understanding of user-centered design principles",
                'location' => 'Siem Reap',
                'salary_min' => 2000000,
                'salary_max' => 3500000,
                'status' => 'open',
                'posted_date' => Carbon::now()->subDays(10),
                'closing_date' => Carbon::now()->addDays(20),
            ],
            [
                'title' => 'DevOps Engineer',
                'department' => 'IT',
                'description' => 'We are seeking a DevOps Engineer to help us build and maintain our cloud infrastructure. Experience with AWS, Docker, and CI/CD pipelines is essential.',
                'requirements' => "• 4+ years of experience in DevOps\n• Strong knowledge of AWS or Azure\n• Experience with Docker and Kubernetes\n• Understanding of CI/CD pipelines\n• Good scripting skills (Python, Bash)",
                'location' => 'Remote',
                'salary_min' => 3500000,
                'salary_max' => 5500000,
                'status' => 'open',
                'posted_date' => Carbon::now()->subDays(3),
                'closing_date' => Carbon::now()->addDays(27),
            ],
            [
                'title' => 'Marketing Manager',
                'department' => 'Marketing',
                'description' => 'Lead our marketing team and drive brand awareness. You will develop and implement marketing strategies to promote our products and services.',
                'requirements' => "• 5+ years of experience in marketing\n• Proven track record in digital marketing\n• Strong leadership and communication skills\n• Experience with SEO, SEM, and social media marketing",
                'location' => 'Phnom Penh',
                'salary_min' => 2500000,
                'salary_max' => 4000000,
                'status' => 'on_hold',
                'posted_date' => Carbon::now()->subDays(15),
                'closing_date' => Carbon::now()->addDays(15),
            ],
            [
                'title' => 'Accountant',
                'department' => 'Finance',
                'description' => 'We are looking for a detail-oriented Accountant to manage our financial records and ensure compliance with regulations.',
                'requirements' => "• Bachelor's degree in Accounting\n• 3+ years of experience\n• Knowledge of Cambodian tax regulations\n• Proficiency in accounting software\n• Good attention to detail",
                'location' => 'Battambang',
                'salary_min' => 1500000,
                'salary_max' => 2500000,
                'status' => 'closed',
                'posted_date' => Carbon::now()->subDays(45),
                'closing_date' => Carbon::now()->subDays(5),
            ],
            [
                'title' => 'Full Stack Developer',
                'department' => 'IT',
                'description' => 'Exciting opportunity for a Full Stack Developer to join our growing team. You will work on both frontend and backend development.',
                'requirements' => "• 3+ years of full stack development\n• Experience with PHP, Laravel, and Vue.js\n• Knowledge of RESTful APIs\n• Understanding of database management\n• Good communication skills",
                'location' => 'Hybrid - Phnom Penh',
                'salary_min' => 2500000,
                'salary_max' => 4000000,
                'status' => 'open',
                'posted_date' => Carbon::now()->subDays(7),
                'closing_date' => Carbon::now()->addDays(23),
            ],
            [
                'title' => 'HR Business Partner',
                'department' => 'HR',
                'description' => 'We are seeking an experienced HR Business Partner to align HR strategies with business objectives and support our growing team.',
                'requirements' => "• 5+ years of HR experience\n• Strong knowledge of Cambodian labor law\n• Excellent interpersonal skills\n• Experience in recruitment and talent management",
                'location' => 'Phnom Penh',
                'salary_min' => 2800000,
                'salary_max' => 4200000,
                'status' => 'on_hold',
                'posted_date' => Carbon::now()->subDays(20),
                'closing_date' => Carbon::now()->addDays(10),
            ],
            [
                'title' => 'Data Analyst',
                'department' => 'IT',
                'description' => 'Join our data team as a Data Analyst. You will analyze complex datasets and provide insights to support business decisions.',
                'requirements' => "• 2+ years of experience in data analysis\n• Proficiency in SQL and Python\n• Experience with data visualization tools\n• Strong analytical and problem-solving skills",
                'location' => 'Sihanoukville',
                'salary_min' => 1800000,
                'salary_max' => 3000000,
                'status' => 'open',
                'posted_date' => Carbon::now()->subDays(2),
                'closing_date' => Carbon::now()->addDays(28),
            ],
        ];

        foreach ($specificVacancies as $data) {
            // Find department by name
            $department = $departments->firstWhere('name', $data['department']);

            Vacancy::updateOrCreate(
                [
                    'title' => $data['title'],
                    'department_id' => $department?->id,
                ],
                [
                    'description' => $data['description'],
                    'requirements' => $data['requirements'],
                    'location' => $data['location'],
                    'salary_min' => $data['salary_min'],
                    'salary_max' => $data['salary_max'],
                    'status' => $data['status'],
                    'applicants_count' => $this->getRandomApplicants($data['status']),
                    'posted_date' => $data['posted_date'],
                    'closing_date' => $data['closing_date'],
                ]
            );
        }
    }

    /**
     * Get random applicants count based on status
     */
    private function getRandomApplicants($status)
    {
        return match ($status) {
            'open' => $this->faker->numberBetween(5, 50),
            'closed' => $this->faker->numberBetween(20, 100),
            'on_hold' => $this->faker->numberBetween(0, 15),
            default => $this->faker->numberBetween(0, 30),
        };
    }

    /**
     * Display summary of created vacancies
     */
    private function displaySummary()
    {
        $openCount = Vacancy::where('status', 'open')->count();
        $closedCount = Vacancy::where('status', 'closed')->count();
        $onHoldCount = Vacancy::where('status', 'on_hold')->count();
        $totalApplicants = Vacancy::sum('applicants_count');

        $this->command->info("\n📊 Summary:");
        $this->command->info("   • Open: {$openCount}");
        $this->command->info("   • Closed: {$closedCount}");
        $this->command->info("   • On Hold: {$onHoldCount}");
        $this->command->info("   • Total Applicants: {$totalApplicants}");
    }
}
