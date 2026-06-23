<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Candidate;
use App\Models\CandidateStatusHistory;
use App\Models\Employee;
use Carbon\Carbon;

class CandidateSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📝 Creating candidates...');

        // Create 50 candidates with factory
        Candidate::factory(50)->create()->each(function ($candidate) {
            // Create status history for each candidate
            $this->createStatusHistory($candidate);
        });

        // Create specific candidates
        $this->createSpecificCandidates();

        $this->command->info('✅ ' . Candidate::count() . ' candidates created');
        $this->command->info('✅ ' . CandidateStatusHistory::count() . ' status histories created');
    }

    private function createStatusHistory($candidate)
    {
        // Status flow MUST match the ENUM in your migration
        // Migration allows: ['new', 'screening', 'interview', 'technical_test', 'hr_interview', 'offered', 'hired', 'rejected', 'withdrawn']
        $statusFlow = [
            'new',
            'screening',
            'interview',
            'technical_test',
            'hr_interview',
            'offered',
            'hired'
        ];

        // Find current status index
        $currentIndex = array_search($candidate->status, $statusFlow);

        if ($currentIndex === false) {
            // If status not found, just create one history
            CandidateStatusHistory::create([
                'candidate_id' => $candidate->id,
                'old_status' => null,
                'new_status' => $candidate->status,
                'notes' => 'Initial status',
                'updated_by' => $this->getRandomEmployeeId(),
                'created_at' => $candidate->created_at,
                'updated_at' => $candidate->created_at,
            ]);
            return;
        }

        // Create history up to current status
        for ($i = 0; $i <= $currentIndex; $i++) {
            $status = $statusFlow[$i];
            $previousStatus = $i > 0 ? $statusFlow[$i - 1] : null;

            CandidateStatusHistory::create([
                'candidate_id' => $candidate->id,
                'old_status' => $previousStatus,
                'new_status' => $status,
                'notes' => $this->getStatusNotes($status, $candidate),
                'updated_by' => $this->getRandomEmployeeId(),
                'created_at' => $candidate->created_at->addDays($i * 2 + rand(0, 2)),
                'updated_at' => $candidate->created_at->addDays($i * 2 + rand(0, 2)),
            ]);
        }
    }

    private function createSpecificCandidates()
    {
        $specificCandidates = [
            [
                'first_name' => 'Sopheap',
                'last_name' => 'Vann',
                'email' => 'sopheap.vann@example.com',
                'phone' => '012345678',
                'position_applied' => 'Senior Software Engineer',
                'experience_years' => 8,
                'current_salary' => 2500000,
                'expected_salary' => 3500000,
                'location' => 'Phnom Penh',
                'status' => 'hired',
                'notes' => 'Excellent candidate with strong technical skills.',
            ],
            [
                'first_name' => 'Sreyneang',
                'last_name' => 'Kong',
                'email' => 'sreyneang.kong@example.com',
                'phone' => '011234567',
                'position_applied' => 'UX/UI Designer',
                'experience_years' => 5,
                'current_salary' => 1800000,
                'expected_salary' => 2800000,
                'location' => 'Siem Reap',
                'status' => 'interview',
                'notes' => 'Creative designer with a strong portfolio.',
            ],
            [
                'first_name' => 'Rithy',
                'last_name' => 'Chhay',
                'email' => 'rithy.chhay@example.com',
                'phone' => '016789012',
                'position_applied' => 'DevOps Engineer',
                'experience_years' => 6,
                'current_salary' => 3000000,
                'expected_salary' => 4000000,
                'location' => 'Phnom Penh',
                'status' => 'offered',
                'notes' => 'Strong DevOps background. Offer extended.',
            ],
            [
                'first_name' => 'Sokha',
                'last_name' => 'Pheak',
                'email' => 'sokha.pheak@example.com',
                'phone' => '092345678',
                'position_applied' => 'Marketing Manager',
                'experience_years' => 7,
                'current_salary' => 2200000,
                'expected_salary' => 3200000,
                'location' => 'Battambang',
                'status' => 'rejected',
                'notes' => 'Good candidate but not the right fit.',
            ],
            [
                'first_name' => 'Dara',
                'last_name' => 'Sok',
                'email' => 'dara.sok@example.com',
                'phone' => '078901234',
                'position_applied' => 'Full Stack Developer',
                'experience_years' => 4,
                'current_salary' => 1500000,
                'expected_salary' => 2500000,
                'location' => 'Phnom Penh',
                'status' => 'screening',
                'notes' => 'Promising candidate with good full stack experience.',
            ],
        ];

        foreach ($specificCandidates as $data) {
            Candidate::updateOrCreate(
                ['email' => $data['email']],
                $data
            );
        }
    }

    private function getStatusNotes($status, $candidate)
    {
        $name = $candidate->first_name . ' ' . $candidate->last_name;

        $notes = [
            'new' => "Application received for {$name}",
            'screening' => "Screening started for {$name}",
            'interview' => "Interview scheduled for {$name}",
            'technical_test' => "Technical test assigned to {$name}",
            'hr_interview' => "HR interview completed for {$name}",
            'offered' => "Offer extended to {$name}",
            'hired' => "{$name} hired successfully",
            'rejected' => "{$name} was rejected",
            'withdrawn' => "{$name} withdrew application",
        ];

        return $notes[$status] ?? "Status changed to {$status} for {$name}";
    }

    private function getRandomEmployeeId()
    {
        $employee = Employee::inRandomOrder()->first();
        return $employee?->id;
    }
}
