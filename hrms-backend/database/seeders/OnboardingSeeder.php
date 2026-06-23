<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Onboarding;
use App\Models\Candidate;
use App\Models\Employee;
use App\Models\Vacancy;
use Carbon\Carbon;
use Faker\Factory as Faker;

class OnboardingSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📝 Creating onboarding records...');

        $candidates = Candidate::all();
        $employees = Employee::all();
        $vacancies = Vacancy::all();

        if ($candidates->isEmpty()) {
            $this->command->warn('⚠️ No candidates found. Please run CandidateSeeder first.');
            return;
        }

        if ($employees->isEmpty()) {
            $this->command->warn('⚠️ No employees found. Please run EmployeeSeeder first.');
            return;
        }

        // Create onboarding records
        $this->createOnboardingRecords($candidates, $employees, $vacancies);

        // Create specific onboarding records
        $this->createSpecificOnboarding();

        // Display summary
        $this->displaySummary();
    }

    private function createOnboardingRecords($candidates, $employees, $vacancies)
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

        $faker = Faker::create();
        $onboardingCount = min($candidates->count(), 30);

        // Create onboarding for selected candidates
        $selectedCandidates = $candidates->random($onboardingCount);

        foreach ($selectedCandidates as $index => $candidate) {
            // Skip if candidate already has onboarding
            if (Onboarding::where('candidate_id', $candidate->id)->exists()) {
                continue;
            }

            $status = $faker->randomElement($statuses);
            $progress = $this->getProgressByStatus($status);

            $employee = $employees->random();
            $vacancy = $vacancies->random();
            $createdBy = $employees->random();

            $startDate = $faker->dateTimeBetween('-3 months', 'now');
            $expectedEndDate = $faker->optional(0.7)->dateTimeBetween($startDate, '+3 months');
            $actualEndDate = ($status === 'onboarding_completed')
                ? $faker->dateTimeBetween($startDate, '+2 months')
                : null;

            // Get IDs only
            $employeeId = $employee?->id;
            $vacancyId = $vacancy?->id;
            $createdById = $createdBy?->id;

            Onboarding::create([
                'candidate_id' => $candidate->id,
                'employee_id' => $employeeId,
                'vacancy_id' => $vacancyId,
                'position_title' => $this->generatePositionTitle(),
                'start_date' => $startDate,
                'expected_end_date' => $expectedEndDate,
                'actual_end_date' => $actualEndDate,
                'status' => $status,
                'progress' => $progress,
                'notes' => $faker->optional(0.6)->paragraphs(2, true),
                'tasks' => $this->generateTasks($status),
                'created_by' => $createdById,
                'updated_by' => $createdById,
                'created_at' => $startDate,
                'updated_at' => $startDate,
            ]);

            // FIXED: Use concatenation instead of {$index + 1}
            if (($index + 1) % 10 == 0) {
                $createdCount = $index + 1;
                $this->command->info("   ✅ Created {$createdCount} onboarding records...");
            }
        }

        $this->command->info('✅ Created ' . Onboarding::count() . ' onboarding records');
    }

    private function createSpecificOnboarding()
    {
        $specificOnboardings = [
            [
                'position_title' => 'Senior Software Engineer',
                'status' => 'onboarding_completed',
                'progress' => 100,
                'start_date' => Carbon::now()->subMonths(2),
                'expected_end_date' => Carbon::now()->subMonths(1),
                'actual_end_date' => Carbon::now()->subMonths(1),
                'notes' => 'Excellent onboarding process. Employee fully integrated into the team.',
            ],
            [
                'position_title' => 'UX/UI Designer',
                'status' => 'training_started',
                'progress' => 75,
                'start_date' => Carbon::now()->subWeeks(3),
                'expected_end_date' => Carbon::now()->addWeeks(2),
                'actual_end_date' => null,
                'notes' => 'Currently in training phase. Showing great progress.',
            ],
            [
                'position_title' => 'Marketing Manager',
                'status' => 'orientation_completed',
                'progress' => 65,
                'start_date' => Carbon::now()->subWeeks(2),
                'expected_end_date' => Carbon::now()->addWeeks(3),
                'actual_end_date' => null,
                'notes' => 'Orientation completed. Starting training next week.',
            ],
            [
                'position_title' => 'Accountant',
                'status' => 'pending',
                'progress' => 0,
                'start_date' => Carbon::now()->addDays(5),
                'expected_end_date' => Carbon::now()->addMonths(1),
                'actual_end_date' => null,
                'notes' => 'Pending onboarding. Awaiting document submission.',
            ],
            [
                'position_title' => 'DevOps Engineer',
                'status' => 'cancelled',
                'progress' => 0,
                'start_date' => Carbon::now()->subWeeks(4),
                'expected_end_date' => Carbon::now()->subWeeks(2),
                'actual_end_date' => null,
                'notes' => 'Onboarding cancelled due to candidate withdrawing.',
            ],
        ];

        foreach ($specificOnboardings as $data) {
            $candidate = Candidate::inRandomOrder()->first();
            $employee = Employee::inRandomOrder()->first();
            $vacancy = Vacancy::inRandomOrder()->first();
            $createdBy = Employee::inRandomOrder()->first();

            if (!$candidate) continue;

            // Get IDs only
            $employeeId = $employee?->id;
            $vacancyId = $vacancy?->id;
            $createdById = $createdBy?->id;

            Onboarding::updateOrCreate(
                [
                    'candidate_id' => $candidate->id,
                    'position_title' => $data['position_title'],
                ],
                [
                    'employee_id' => $employeeId,
                    'vacancy_id' => $vacancyId,
                    'start_date' => $data['start_date'],
                    'expected_end_date' => $data['expected_end_date'],
                    'actual_end_date' => $data['actual_end_date'],
                    'status' => $data['status'],
                    'progress' => $data['progress'],
                    'notes' => $data['notes'],
                    'tasks' => $this->generateTasks($data['status']),
                    'created_by' => $createdById,
                    'updated_by' => $createdById,
                ]
            );
        }
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

        $faker = Faker::create();
        return $faker->randomElement($positions);
    }

    private function generateTasks($status)
    {
        $faker = Faker::create();
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

        $selectedTasks = $faker->randomElements($allTasks, min($numTasks, count($allTasks)));

        $progress = $this->getProgressByStatus($status);
        $completedCount = (int) round(($progress / 100) * count($selectedTasks));

        foreach ($selectedTasks as $index => $task) {
            $isCompleted = $index < $completedCount;

            $tasks[] = [
                'task' => $task,
                'completed' => $isCompleted,
                'completed_at' => $isCompleted ? $faker->dateTimeBetween('-30 days', 'now') : null,
                'notes' => $faker->optional(0.3)->sentence,
            ];
        }

        return $tasks;
    }

    /**
     * Display summary of created onboarding records
     */
    private function displaySummary()
    {
        $totalOnboardings = Onboarding::count();

        if ($totalOnboardings === 0) {
            $this->command->info("\n📊 No onboarding records found.");
            return;
        }

        $this->command->info("\n📊 ========================================");
        $this->command->info("📊 ONBOARDING SUMMARY");
        $this->command->info("📊 ========================================");

        // Basic stats
        $this->command->info("\n📈 Overview:");
        $this->command->info("   • Total Onboardings: " . $totalOnboardings);
        $this->command->info("   • Pending: " . Onboarding::where('status', 'pending')->count());
        $this->command->info("   • In Progress: " . Onboarding::whereNotIn('status', ['pending', 'onboarding_completed', 'cancelled'])->count());
        $this->command->info("   • Completed: " . Onboarding::where('status', 'onboarding_completed')->count());
        $this->command->info("   • Cancelled: " . Onboarding::where('status', 'cancelled')->count());
        $this->command->info("   • Average Progress: " . round(Onboarding::avg('progress') ?? 0, 2) . '%');

        // Status distribution
        $this->command->info("\n📂 Status Distribution:");
        $statuses = Onboarding::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->orderBy('count', 'desc')
            ->get();

        if ($statuses->isNotEmpty()) {
            foreach ($statuses as $status) {
                $percentage = round(($status->count / $totalOnboardings) * 100, 1);
                $bar = str_repeat('█', (int)($percentage / 5));
                $this->command->info("   • {$status->status}: {$status->count} ({$percentage}%) {$bar}");
            }
        }

        // Progress distribution
        $this->command->info("\n📈 Progress Distribution:");
        $progressRanges = [
            '0-25%' => Onboarding::whereBetween('progress', [0, 25])->count(),
            '26-50%' => Onboarding::whereBetween('progress', [26, 50])->count(),
            '51-75%' => Onboarding::whereBetween('progress', [51, 75])->count(),
            '76-99%' => Onboarding::whereBetween('progress', [76, 99])->count(),
            '100%' => Onboarding::where('progress', 100)->count(),
        ];

        foreach ($progressRanges as $range => $count) {
            if ($count > 0) {
                $percentage = round(($count / $totalOnboardings) * 100, 1);
                $bar = str_repeat('█', (int)($percentage / 5));
                $this->command->info("   • {$range}: {$count} ({$percentage}%) {$bar}");
            }
        }

        $this->command->info("\n📊 ========================================");
    }
}
