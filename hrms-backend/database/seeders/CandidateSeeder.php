<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Candidate;
use App\Models\CandidateStatusHistory;

class CandidateSeeder extends Seeder
{
    public function run()
    {
        // Create 50 candidates with factory
        Candidate::factory(50)->create()->each(function ($candidate) {
            // Create status history for each candidate
            $this->createStatusHistory($candidate);
        });

        $this->command->info('✅ ' . Candidate::count() . ' candidates created');
    }

    private function createStatusHistory($candidate)
    {
        $statusFlow = ['new', 'contacted', 'screening', 'interview_scheduled', 'interview_completed'];

        // Find current status index
        $currentIndex = array_search($candidate->status, $statusFlow);

        if ($currentIndex === false) {
            $currentIndex = 0;
        }

        // Create history up to current status
        for ($i = 0; $i <= $currentIndex; $i++) {
            CandidateStatusHistory::create([
                'candidate_id' => $candidate->id,
                'old_status' => $i > 0 ? $statusFlow[$i - 1] : null,
                'new_status' => $statusFlow[$i],
                'updated_by' => null,
                'reason' => "Status changed to " . $statusFlow[$i],
                'created_at' => $candidate->created_at->addDays($i * 2),
            ]);
        }
    }
}
