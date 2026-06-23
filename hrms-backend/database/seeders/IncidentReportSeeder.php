<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\IncidentReport;
use App\Models\IncidentStatusHistory;
use App\Models\Employee;
use Carbon\Carbon;
use Faker\Factory as Faker;

class IncidentReportSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📝 Creating incident reports...');

        // Create 50 incident reports
        $this->createIncidentReports();

        // Create specific incident reports
        $this->createSpecificIncidents();

        // Create status histories
        $this->createStatusHistories();

        $this->displaySummary();
    }

    private function createIncidentReports()
    {
        $statuses = ['reported', 'under_investigation', 'in_review', 'resolved', 'closed', 'rejected'];
        $statusWeights = [20, 25, 20, 15, 15, 5]; // 20% reported, 25% under_investigation, etc.

        $total = 50;

        for ($i = 0; $i < $total; $i++) {
            $status = $this->getWeightedStatus($statuses, $statusWeights);
            $this->createIncidentReport($status);
        }

        $this->command->info('✅ ' . IncidentReport::count() . ' incident reports created');
    }

    private function createIncidentReport($status)
    {
        $faker = Faker::create();

        $reportedBy = Employee::inRandomOrder()->first();
        $createdBy = Employee::inRandomOrder()->first() ?? 1;
        $assignedTo = Employee::inRandomOrder()->first();

        $categories = [
            'safety',
            'security',
            'health',
            'property_damage',
            'environmental',
            'harassment',
            'discrimination',
            'fraud',
            'theft',
            'data_breach',
            'policy_violation',
            'workplace_violence',
            'accident',
            'near_miss',
            'other'
        ];

        $severities = ['low', 'medium', 'high', 'critical'];

        $incidentDate = $faker->dateTimeBetween('-6 months', 'now');
        $resolvedDate = ($status === 'resolved' || $status === 'closed')
            ? $faker->dateTimeBetween($incidentDate, 'now')
            : null;

        $approvalStatus = $this->getApprovalStatusByIncidentStatus($status);

        $report = IncidentReport::create([
            'title' => $this->generateIncidentTitle(),
            'description' => $faker->paragraphs(3, true),
            'location' => $faker->randomElement([
                'Main Office - Floor 3',
                'Warehouse A',
                'Factory Floor',
                'Parking Lot',
                'Cafeteria',
                'Meeting Room 1',
                'IT Department',
                'HR Office',
                'Security Gate',
                'Storage Room'
            ]),
            'incident_date' => $incidentDate,
            'incident_time' => $faker->optional(0.8)->time('H:i:s'),
            'category' => $faker->randomElement($categories),
            'severity' => $faker->randomElement($severities),
            'status' => $status,
            'resolution_notes' => ($status === 'resolved' || $status === 'closed')
                ? $faker->paragraphs(2, true)
                : null,
            'resolved_date' => $resolvedDate,
            'file_path' => $faker->optional(0.3)->filePath(),
            'file_name' => $faker->optional(0.3)->word . '.pdf',
            'witnesses' => $this->generateWitnesses(),
            'approval_flow' => $this->generateApprovalFlow(),
            'reported_by' => $reportedBy?->id,
            'assigned_to' => $assignedTo?->id,
            'created_by' => $createdBy,
            'manager1_id' => $this->getRandomManager(),
            'manager1_status' => $faker->randomElement(['pending', 'approved', 'rejected']),
            'manager1_approved_at' => $faker->optional(0.5)->dateTimeBetween('-30 days', 'now'),
            'manager1_notes' => $faker->optional(0.3)->sentence,
            'manager2_id' => $this->getRandomManager(),
            'manager2_status' => $faker->randomElement(['pending', 'approved', 'rejected']),
            'manager2_approved_at' => $faker->optional(0.4)->dateTimeBetween('-30 days', 'now'),
            'manager2_notes' => $faker->optional(0.3)->sentence,
            'manager3_id' => $this->getRandomManager(),
            'manager3_status' => $faker->randomElement(['pending', 'approved', 'rejected']),
            'manager3_approved_at' => $faker->optional(0.3)->dateTimeBetween('-30 days', 'now'),
            'manager3_notes' => $faker->optional(0.3)->sentence,
            'manager4_id' => $this->getRandomManager(),
            'manager4_status' => $faker->randomElement(['pending', 'approved', 'rejected']),
            'manager4_approved_at' => $faker->optional(0.2)->dateTimeBetween('-30 days', 'now'),
            'manager4_notes' => $faker->optional(0.3)->sentence,
            'approval_status' => $approvalStatus,
            'created_at' => $incidentDate,
            'updated_at' => $incidentDate,
        ]);

        return $report;
    }

    private function createSpecificIncidents()
    {
        $specificIncidents = [
            [
                'title' => 'Safety Violation on Factory Floor',
                'category' => 'safety',
                'severity' => 'high',
                'status' => 'under_investigation',
                'description' => 'Employee was observed not wearing required safety equipment on the factory floor. This is a violation of safety policy #42.',
                'location' => 'Factory Floor - Section B',
            ],
            [
                'title' => 'Data Breach Incident',
                'category' => 'data_breach',
                'severity' => 'critical',
                'status' => 'in_review',
                'description' => 'Sensitive employee data was accidentally shared via email to unauthorized recipients. Immediate action required.',
                'location' => 'IT Department',
            ],
            [
                'title' => 'Workplace Harassment Complaint',
                'category' => 'harassment',
                'severity' => 'high',
                'status' => 'under_investigation',
                'description' => 'Employee reported ongoing harassment from a supervisor. Investigation in progress.',
                'location' => 'HR Office',
            ],
            [
                'title' => 'Property Damage Incident',
                'category' => 'property_damage',
                'severity' => 'medium',
                'status' => 'resolved',
                'description' => 'Company vehicle was damaged in the parking lot. Security cameras identified the culprit.',
                'location' => 'Parking Lot',
                'resolution_notes' => 'Perpetrator identified and insurance claim filed. Employee suspended pending investigation.',
            ],
            [
                'title' => 'Near Miss Accident',
                'category' => 'near_miss',
                'severity' => 'medium',
                'status' => 'closed',
                'description' => 'A heavy object fell from a shelf narrowly missing an employee. No injuries reported.',
                'location' => 'Warehouse A',
                'resolution_notes' => 'Shelving inspected and reinforced. New safety protocols implemented.',
            ],
            [
                'title' => 'Fraud Investigation',
                'category' => 'fraud',
                'severity' => 'critical',
                'status' => 'under_investigation',
                'description' => 'Suspicious financial transactions detected in the accounting department. External audit requested.',
                'location' => 'Finance Department',
            ],
            [
                'title' => 'Theft of Company Property',
                'category' => 'theft',
                'severity' => 'high',
                'status' => 'reported',
                'description' => 'Laptops and other equipment reported missing from the IT storage room. Security footage under review.',
                'location' => 'IT Storage Room',
            ],
            [
                'title' => 'Environmental Violation',
                'category' => 'environmental',
                'severity' => 'medium',
                'status' => 'in_review',
                'description' => 'Improper disposal of chemical waste reported. Environmental agency notified.',
                'location' => 'Factory Floor',
            ],
        ];

        foreach ($specificIncidents as $data) {
            $reportedBy = Employee::inRandomOrder()->first();
            $createdBy = Employee::inRandomOrder()->first() ?? 1;

            IncidentReport::updateOrCreate(
                ['title' => $data['title']],
                [
                    'description' => $data['description'],
                    'location' => $data['location'],
                    'category' => $data['category'],
                    'severity' => $data['severity'],
                    'status' => $data['status'],
                    'incident_date' => Carbon::now()->subDays(rand(1, 30)),
                    'incident_time' => Carbon::now()->format('H:i:s'),
                    'reported_by' => $reportedBy?->id,
                    'created_by' => $createdBy,
                    'assigned_to' => Employee::inRandomOrder()->first()?->id,
                    'resolution_notes' => $data['resolution_notes'] ?? null,
                    'resolved_date' => ($data['status'] === 'resolved' || $data['status'] === 'closed')
                        ? Carbon::now()->subDays(rand(1, 10))
                        : null,
                    'approval_status' => $this->getApprovalStatusByIncidentStatus($data['status']),
                ]
            );
        }
    }

    private function createStatusHistories()
    {
        $this->command->info('📜 Creating incident status histories...');

        $incidents = IncidentReport::all();
        $historyCount = 0;

        foreach ($incidents as $incident) {
            // Create 1-4 history entries per incident
            $numHistories = rand(1, 4);

            $statusFlow = ['reported', 'under_investigation', 'in_review', 'resolved', 'closed'];
            $currentStatusIndex = array_search($incident->status, $statusFlow);

            if ($currentStatusIndex === false) {
                $currentStatusIndex = 0;
            }

            for ($i = 0; $i <= min($currentStatusIndex, $numHistories - 1); $i++) {
                $status = $statusFlow[$i];
                $previousStatus = $i > 0 ? $statusFlow[$i - 1] : null;

                $approvalFlow = ['pending', 'in_progress', 'approved'];
                $approvalIndex = min($i, count($approvalFlow) - 1);

                IncidentStatusHistory::create([
                    'incident_report_id' => $incident->id,
                    'old_status' => $previousStatus,
                    'new_status' => $status,
                    'old_approval_status' => $i > 0 ? $approvalFlow[$approvalIndex - 1] : null,
                    'new_approval_status' => $approvalFlow[$approvalIndex],
                    'notes' => $this->getStatusChangeNotes($status),
                    'updated_by' => Employee::inRandomOrder()->first()?->id,
                    'created_at' => $incident->created_at->addDays($i * 3),
                    'updated_at' => $incident->created_at->addDays($i * 3),
                ]);

                $historyCount++;
            }
        }

        $this->command->info('✅ ' . $historyCount . ' status history records created');
    }

    private function getStatusChangeNotes($status)
    {
        $notes = [
            'reported' => ['Incident reported', 'New incident created'],
            'under_investigation' => ['Investigation started', 'Assigned to investigator'],
            'in_review' => ['Under review by management', 'Reviewing findings'],
            'resolved' => ['Resolution implemented', 'Issue resolved'],
            'closed' => ['Case closed', 'File archived'],
            'rejected' => ['Claim rejected', 'Insufficient evidence'],
        ];

        $statusNotes = $notes[$status] ?? ['Status updated'];
        return $statusNotes[array_rand($statusNotes)];
    }

    private function getApprovalStatusByIncidentStatus($status)
    {
        $map = [
            'reported' => 'pending',
            'under_investigation' => 'in_progress',
            'in_review' => 'in_progress',
            'resolved' => 'approved',
            'closed' => 'approved',
            'rejected' => 'rejected',
        ];

        return $map[$status] ?? 'pending';
    }

    private function getWeightedStatus($statuses, $weights)
    {
        $total = array_sum($weights);
        $random = rand(1, $total);

        $cumulative = 0;
        foreach ($statuses as $index => $status) {
            $cumulative += $weights[$index];
            if ($random <= $cumulative) {
                return $status;
            }
        }

        return $statuses[0];
    }

    private function generateIncidentTitle()
    {
        $titles = [
            'Safety',
            'Security',
            'Health',
            'Property Damage',
            'Environmental',
            'Harassment',
            'Discrimination',
            'Fraud',
            'Theft',
            'Data Breach',
            'Policy Violation',
            'Workplace Violence',
            'Accident',
            'Near Miss'
        ];

        $actions = [
            'Reported',
            'Incident',
            'Violation',
            'Issue',
            'Concern',
            'Event',
            'Occurrence',
            'Matter',
            'Situation',
            'Case'
        ];

        $faker = Faker::create();
        return $faker->randomElement($titles) . ' ' .
            $faker->randomElement($actions) . ' ' .
            $faker->optional(0.5)->randomElement([
                'at Warehouse',
                'on Factory Floor',
                'at Main Office',
                'during Shift',
                'during Meeting',
                'at Parking Lot'
            ]);
    }

    private function generateWitnesses()
    {
        $faker = Faker::create();
        $witnesses = [];
        $numWitnesses = rand(0, 4);

        for ($i = 0; $i < $numWitnesses; $i++) {
            $employee = Employee::inRandomOrder()->first();
            if ($employee) {
                $witnesses[] = [
                    'employee_id' => $employee->id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department?->name,
                    'phone' => $employee->phone,
                    'email' => $employee->email,
                    'statement' => $faker->optional(0.5)->sentence,
                ];
            }
        }

        return $witnesses;
    }

    private function generateApprovalFlow()
    {
        $levels = [
            'Manager 1' => 'pending',
            'Manager 2' => 'pending',
            'Manager 3' => 'pending',
            'Manager 4' => 'pending',
        ];

        foreach ($levels as $level => &$status) {
            $random = rand(1, 100);
            if ($random <= 40) {
                $status = rand(0, 1) ? 'approved' : 'rejected';
            } elseif ($random <= 70) {
                $status = 'in_progress';
            }
        }

        return $levels;
    }

    private function getRandomManager()
    {
        $manager = Employee::whereIn('position_id', [1, 3, 4])
            ->inRandomOrder()
            ->first();

        return $manager?->id;
    }

    private function displaySummary()
    {
        $stats = [
            'Total Incidents' => IncidentReport::count(),
            'Reported' => IncidentReport::where('status', 'reported')->count(),
            'Under Investigation' => IncidentReport::where('status', 'under_investigation')->count(),
            'In Review' => IncidentReport::where('status', 'in_review')->count(),
            'Resolved' => IncidentReport::where('status', 'resolved')->count(),
            'Closed' => IncidentReport::where('status', 'closed')->count(),
            'Rejected' => IncidentReport::where('status', 'rejected')->count(),
            'Status Histories' => IncidentStatusHistory::count(),
        ];

        $this->command->info("\n📊 Incident Summary:");
        foreach ($stats as $key => $value) {
            $this->command->info("   • {$key}: {$value}");
        }

        // By category
        $this->command->info("\n📂 By Category:");
        $categories = IncidentReport::selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->get();
        foreach ($categories as $category) {
            $this->command->info("   • {$category->category}: {$category->count}");
        }

        // By severity
        $this->command->info("\n⚠️ By Severity:");
        $severities = IncidentReport::selectRaw('severity, COUNT(*) as count')
            ->groupBy('severity')
            ->get();
        foreach ($severities as $severity) {
            $this->command->info("   • {$severity->severity}: {$severity->count}");
        }
    }
}
