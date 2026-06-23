<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Onboarding;
use App\Models\OnboardingStatusHistory;
use App\Models\Employee;
use Carbon\Carbon;
use Faker\Factory as Faker;

class OnboardingStatusHistorySeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📝 Creating onboarding status histories...');

        // Get all onboarding records
        $onboardings = Onboarding::all();

        if ($onboardings->isEmpty()) {
            $this->command->warn('⚠️ No onboarding records found. Please run OnboardingSeeder first.');
            return;
        }

        $historyCount = 0;

        foreach ($onboardings as $onboarding) {
            // Create status history based on current status
            $this->createHistoryForOnboarding($onboarding);
            $historyCount++;
        }

        // Create additional random histories
        $this->createAdditionalHistories();

        $this->command->info('✅ ' . OnboardingStatusHistory::count() . ' onboarding status histories created');
        $this->displaySummary();
    }

    private function createHistoryForOnboarding($onboarding)
    {
        $statusFlow = $this->getStatusFlow();
        $currentStatus = $onboarding->status;
        $currentProgress = $onboarding->progress ?? 0;

        // Find current status index
        $currentIndex = array_search($currentStatus, $statusFlow);

        if ($currentIndex === false) {
            // If status not in flow, create just one history
            $this->createSingleHistory($onboarding);
            return;
        }

        // Create history for each status transition up to current status
        for ($i = 0; $i <= $currentIndex; $i++) {
            $status = $statusFlow[$i];
            $previousStatus = $i > 0 ? $statusFlow[$i - 1] : null;

            // Calculate progress for this step
            $progressStep = floor(($i / count($statusFlow)) * 100);
            $oldProgress = $i > 0 ? floor((($i - 1) / count($statusFlow)) * 100) : 0;

            $updatedBy = Employee::inRandomOrder()->first();
            $updatedById = $updatedBy?->id;

            OnboardingStatusHistory::create([
                'onboarding_id' => $onboarding->id,
                'old_status' => $previousStatus,
                'new_status' => $status,
                'old_progress' => $oldProgress,
                'new_progress' => $progressStep,
                'notes' => $this->getStatusNotes($status, $onboarding),
                'updated_by' => $updatedById,
                'created_at' => $onboarding->created_at->addDays($i * 2 + rand(0, 2)),
                'updated_at' => $onboarding->created_at->addDays($i * 2 + rand(0, 2)),
            ]);
        }

        // If current progress is higher than the status flow suggests, add additional progress updates
        if ($currentProgress > 100) {
            $currentProgress = 100;
        }

        // Add progress-only updates if needed
        $this->addProgressUpdates($onboarding, $currentIndex, $currentProgress);
    }

    private function addProgressUpdates($onboarding, $currentIndex, $currentProgress)
    {
        $statusFlow = $this->getStatusFlow();
        $lastStatusProgress = floor(($currentIndex / count($statusFlow)) * 100);

        // If progress is significantly higher than status progress, add progress updates
        if ($currentProgress > $lastStatusProgress + 10) {
            $progressSteps = range($lastStatusProgress + 10, $currentProgress, 10);

            foreach ($progressSteps as $progress) {
                if ($progress > 100) break;

                $updatedBy = Employee::inRandomOrder()->first();
                $updatedById = $updatedBy?->id;

                OnboardingStatusHistory::create([
                    'onboarding_id' => $onboarding->id,
                    'old_status' => $onboarding->status,
                    'new_status' => $onboarding->status,
                    'old_progress' => $progress - 10,
                    'new_progress' => $progress,
                    'notes' => 'Progress updated to ' . $progress . '%',
                    'updated_by' => $updatedById,
                    'created_at' => $onboarding->created_at->addDays(rand(1, 30)),
                    'updated_at' => $onboarding->created_at->addDays(rand(1, 30)),
                ]);
            }
        }
    }

    private function createSingleHistory($onboarding)
    {
        $updatedBy = Employee::inRandomOrder()->first();
        $updatedById = $updatedBy?->id;

        OnboardingStatusHistory::create([
            'onboarding_id' => $onboarding->id,
            'old_status' => null,
            'new_status' => $onboarding->status ?? 'pending',
            'old_progress' => 0,
            'new_progress' => $onboarding->progress ?? 0,
            'notes' => 'Initial onboarding status',
            'updated_by' => $updatedById,
            'created_at' => $onboarding->created_at,
            'updated_at' => $onboarding->created_at,
        ]);
    }

    private function createAdditionalHistories()
    {
        $this->command->info('📝 Creating additional history records...');

        // Get onboarding records that are completed or in progress
        $onboardings = Onboarding::whereIn('status', [
            'orientation_scheduled',
            'orientation_completed',
            'training_started',
            'training_completed',
            'onboarding_completed'
        ])->get();

        foreach ($onboardings as $onboarding) {
            // Add 1-3 additional random history entries
            $numAdditional = rand(1, 3);

            for ($i = 0; $i < $numAdditional; $i++) {
                $statuses = ['pending', 'documents_received', 'contract_signed', 'background_check'];
                $randomStatus = $statuses[array_rand($statuses)];

                $updatedBy = Employee::inRandomOrder()->first();
                $updatedById = $updatedBy?->id;

                OnboardingStatusHistory::create([
                    'onboarding_id' => $onboarding->id,
                    'old_status' => $randomStatus,
                    'new_status' => $onboarding->status,
                    'old_progress' => rand(0, 50),
                    'new_progress' => $onboarding->progress ?? rand(50, 90),
                    'notes' => $this->getRandomNotes(),
                    'updated_by' => $updatedById,
                    'created_at' => $onboarding->created_at->addDays(rand(1, 20)),
                    'updated_at' => $onboarding->created_at->addDays(rand(1, 20)),
                ]);
            }
        }
    }

    private function getStatusFlow()
    {
        return [
            'pending',
            'documents_received',
            'contract_signed',
            'background_check',
            'orientation_scheduled',
            'orientation_completed',
            'training_started',
            'training_completed',
            'onboarding_completed'
        ];
    }

    private function getStatusNotes($status, $onboarding)
    {
        $employeeName = $onboarding->employee?->first_name . ' ' . $onboarding->employee?->last_name ?? 'New employee';

        $notes = [
            'pending' => 'Onboarding process initiated for ' . $employeeName,
            'documents_received' => 'All required documents received and verified for ' . $employeeName,
            'contract_signed' => 'Employment contract signed by ' . $employeeName,
            'background_check' => 'Background check completed for ' . $employeeName,
            'orientation_scheduled' => 'Orientation scheduled for ' . $employeeName,
            'orientation_completed' => 'Orientation completed successfully for ' . $employeeName,
            'training_started' => 'Training program started for ' . $employeeName,
            'training_completed' => 'All training modules completed by ' . $employeeName,
            'onboarding_completed' => 'Onboarding process completed for ' . $employeeName . ' 🎉',
            'cancelled' => 'Onboarding process cancelled for ' . $employeeName,
        ];

        return $notes[$status] ?? 'Status updated for ' . $employeeName;
    }

    private function getRandomNotes()
    {
        $notes = [
            'Progress updated after document review',
            'Status changed during onboarding process',
            'Updated by HR team',
            'Additional documents received',
            'Training schedule confirmed',
            'Department orientation completed',
            'IT setup completed',
            'Welcome package delivered',
            'First day orientation completed',
            'Benefits enrollment completed',
        ];

        return $notes[array_rand($notes)];
    }

    private function displaySummary()
    {
        $stats = [
            'Total Histories' => OnboardingStatusHistory::count(),
            'Unique Onboardings' => OnboardingStatusHistory::distinct('onboarding_id')->count(),
        ];

        $this->command->info("\n📊 Onboarding Status History Summary:");
        foreach ($stats as $key => $value) {
            $this->command->info("   • {$key}: {$value}");
        }

        // Status distribution
        $this->command->info("\n📂 Status Distribution:");
        $statuses = OnboardingStatusHistory::selectRaw('new_status, COUNT(*) as count')
            ->groupBy('new_status')
            ->orderBy('count', 'desc')
            ->get();
        foreach ($statuses as $status) {
            $this->command->info("   • {$status->new_status}: {$status->count}");
        }
    }
}
