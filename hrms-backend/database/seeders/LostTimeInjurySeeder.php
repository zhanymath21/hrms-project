<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LostTimeInjury;
use App\Models\LostTimeInjuryHistory;
use App\Models\Employee;
use Carbon\Carbon;
use Faker\Factory as Faker;

class LostTimeInjurySeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📝 Creating Lost Time Injuries...');

        // Create 40 Lost Time Injuries
        $this->createLostTimeInjuries();

        // Create specific injuries
        $this->createSpecificInjuries();

        // Create status histories
        $this->createHistories();

        $this->displaySummary();
    }

    private function createLostTimeInjuries()
    {
        $statuses = ['reported', 'under_investigation', 'in_review', 'resolved', 'closed', 'rejected'];
        $statusWeights = [15, 25, 20, 15, 15, 10];

        $total = 40;

        for ($i = 0; $i < $total; $i++) {
            $status = $this->getWeightedStatus($statuses, $statusWeights);
            $this->createLostTimeInjury($status);
        }

        $this->command->info('✅ ' . LostTimeInjury::count() . ' Lost Time Injuries created');
    }

    private function createLostTimeInjury($status)
    {
        $faker = Faker::create();

        $employee = Employee::inRandomOrder()->first();
        $reportedBy = Employee::inRandomOrder()->first();
        $createdBy = Employee::inRandomOrder()->first() ?? 1;

        $bodyParts = [
            'Head',
            'Neck',
            'Shoulder',
            'Arm',
            'Elbow',
            'Wrist',
            'Hand',
            'Finger',
            'Back',
            'Spine',
            'Chest',
            'Abdomen',
            'Hip',
            'Leg',
            'Knee',
            'Ankle',
            'Foot',
            'Toe',
            'Eye',
            'Ear',
            'Face',
            'Multiple'
        ];

        $injuryTypes = [
            'Fracture',
            'Sprain',
            'Strain',
            'Laceration',
            'Contusion',
            'Burn',
            'Chemical Burn',
            'Electrical Shock',
            'Amputation',
            'Crush Injury',
            'Dislocation',
            'Tendonitis',
            'Carpal Tunnel',
            'Hernia',
            'Concussion',
            'Whiplash',
            'Repetitive Strain',
            'Other'
        ];

        $severities = ['Minor', 'Moderate', 'Severe', 'Critical'];

        $injuryDate = $faker->dateTimeBetween('-6 months', 'now');
        $daysLost = $faker->numberBetween(1, 90);
        $returnToWorkDate = ($status === 'resolved' || $status === 'closed')
            ? $faker->dateTimeBetween($injuryDate, '+3 months')
            : null;

        $resolvedDate = ($status === 'resolved' || $status === 'closed')
            ? $faker->dateTimeBetween($injuryDate, 'now')
            : null;

        $approvalStatus = $this->getApprovalStatusByInjuryStatus($status);

        $injury = LostTimeInjury::create([
            // Foreign Keys
            'employee_id' => $employee?->id,
            'reported_by' => $reportedBy?->id,
            'created_by' => $createdBy,

            // Basic Information
            'title' => $this->generateInjuryTitle(),
            'description' => $faker->paragraphs(3, true),
            'location' => $faker->randomElement([
                'Factory Floor - Section A',
                'Factory Floor - Section B',
                'Warehouse - Storage Area',
                'Maintenance Shop',
                'Office - Floor 2',
                'Office - Floor 3',
                'Parking Lot',
                'Cafeteria',
                'Storage Room',
                'Production Line',
                'Loading Dock',
                'Construction Site'
            ]),
            'injury_date' => $injuryDate,
            'injury_time' => $faker->optional(0.8)->time('H:i:s'),

            // Injury Details
            'body_part' => $faker->randomElement($bodyParts),
            'injury_type' => $faker->randomElement($injuryTypes),
            'severity' => $faker->randomElement($severities),

            // Medical Information
            'medical_treatment' => $faker->boolean(80),
            'return_to_work_date' => $returnToWorkDate,
            'days_lost' => $daysLost,
            'medical_notes' => $faker->optional(0.7)->paragraphs(2, true),

            // Status
            'status' => $status,

            // Resolution
            'resolution_notes' => ($status === 'resolved' || $status === 'closed')
                ? $faker->paragraphs(2, true)
                : null,
            'resolved_date' => $resolvedDate,

            // Files
            'file_path' => $faker->optional(0.3)->filePath(),
            'file_name' => $faker->optional(0.3)->word . '.pdf',

            // Witnesses
            'witnesses' => $this->generateWitnesses(),

            // Approval Flow
            'approval_flow' => $this->generateApprovalFlow(),

            // Manager Approvals
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

            // Overall Approval Status
            'approval_status' => $approvalStatus,
        ]);

        return $injury;
    }

    private function createSpecificInjuries()
    {
        $specificInjuries = [
            [
                'title' => 'Back Injury - Heavy Lifting',
                'body_part' => 'Back',
                'injury_type' => 'Strain',
                'severity' => 'Moderate',
                'days_lost' => 14,
                'status' => 'under_investigation',
                'description' => 'Employee sustained back injury while lifting heavy equipment. Incident occurred during warehouse operations.',
                'location' => 'Warehouse - Storage Area',
            ],
            [
                'title' => 'Hand Laceration - Machine Accident',
                'body_part' => 'Hand',
                'injury_type' => 'Laceration',
                'severity' => 'Severe',
                'days_lost' => 21,
                'status' => 'in_review',
                'description' => 'Employee suffered deep laceration to hand while operating machinery. Required immediate medical attention and stitches.',
                'location' => 'Factory Floor - Section A',
            ],
            [
                'title' => 'Foot Fracture - Fall from Height',
                'body_part' => 'Foot',
                'injury_type' => 'Fracture',
                'severity' => 'Critical',
                'days_lost' => 45,
                'status' => 'resolved',
                'description' => 'Employee fell from ladder and fractured foot. Investigation revealed improper ladder placement.',
                'location' => 'Maintenance Shop',
                'resolution_notes' => 'Safety protocols updated. All ladders inspected and replaced where needed.',
            ],
            [
                'title' => 'Chemical Burn - Spill Incident',
                'body_part' => 'Arm',
                'injury_type' => 'Chemical Burn',
                'severity' => 'Severe',
                'days_lost' => 28,
                'status' => 'closed',
                'description' => 'Employee suffered chemical burns to arm during chemical spill. PPE not properly worn.',
                'location' => 'Factory Floor - Section B',
                'resolution_notes' => 'Chemical handling procedures reviewed. Mandatory PPE training implemented.',
            ],
            [
                'title' => 'Shoulder Dislocation - Repetitive Motion',
                'body_part' => 'Shoulder',
                'injury_type' => 'Dislocation',
                'severity' => 'Moderate',
                'days_lost' => 10,
                'status' => 'reported',
                'description' => 'Employee dislocated shoulder while performing repetitive lifting tasks. ER visit required.',
                'location' => 'Production Line',
            ],
            [
                'title' => 'Concussion - Falling Object',
                'body_part' => 'Head',
                'injury_type' => 'Concussion',
                'severity' => 'Severe',
                'days_lost' => 7,
                'status' => 'under_investigation',
                'description' => 'Employee struck on head by falling object. Safety helmet prevented more serious injury.',
                'location' => 'Construction Site',
            ],
            [
                'title' => 'Knee Injury - Slip and Fall',
                'body_part' => 'Knee',
                'injury_type' => 'Sprain',
                'severity' => 'Moderate',
                'days_lost' => 5,
                'status' => 'resolved',
                'description' => 'Employee slipped on wet floor and injured knee. Floor was not marked as wet.',
                'location' => 'Cafeteria',
                'resolution_notes' => 'Wet floor signage improved. Staff reminded to clean spills immediately.',
            ],
            [
                'title' => 'Eye Injury - Foreign Object',
                'body_part' => 'Eye',
                'injury_type' => 'Other',
                'severity' => 'Moderate',
                'days_lost' => 3,
                'status' => 'closed',
                'description' => 'Metal debris entered employee\'s eye while grinding. Safety goggles were not worn.',
                'location' => 'Maintenance Shop',
                'resolution_notes' => 'Safety goggles mandatory in maintenance area. Disciplinary action taken.',
            ],
        ];

        foreach ($specificInjuries as $data) {
            $employee = Employee::inRandomOrder()->first();
            $reportedBy = Employee::inRandomOrder()->first();
            $createdBy = Employee::inRandomOrder()->first() ?? 1;

            $injuryDate = Carbon::now()->subDays(rand(1, 60));
            $resolvedDate = ($data['status'] === 'resolved' || $data['status'] === 'closed')
                ? Carbon::now()->subDays(rand(1, 10))
                : null;

            LostTimeInjury::updateOrCreate(
                ['title' => $data['title']],
                [
                    'employee_id' => $employee?->id,
                    'reported_by' => $reportedBy?->id,
                    'created_by' => $createdBy,
                    'description' => $data['description'],
                    'location' => $data['location'],
                    'injury_date' => $injuryDate,
                    'injury_time' => Carbon::now()->format('H:i:s'),
                    'body_part' => $data['body_part'],
                    'injury_type' => $data['injury_type'],
                    'severity' => $data['severity'],
                    'days_lost' => $data['days_lost'],
                    'medical_treatment' => true,
                    'return_to_work_date' => $resolvedDate ? Carbon::parse($resolvedDate)->addDays(rand(1, 14)) : null,
                    'status' => $data['status'],
                    'resolution_notes' => $data['resolution_notes'] ?? null,
                    'resolved_date' => $resolvedDate,
                    'approval_status' => $this->getApprovalStatusByInjuryStatus($data['status']),
                ]
            );
        }
    }

    private function createHistories()
    {
        $this->command->info('📜 Creating Lost Time Injury histories...');

        $injuries = LostTimeInjury::all();
        $historyCount = 0;

        foreach ($injuries as $injury) {
            $numHistories = rand(1, 4);

            $statusFlow = ['reported', 'under_investigation', 'in_review', 'resolved', 'closed'];
            $currentStatusIndex = array_search($injury->status, $statusFlow);

            if ($currentStatusIndex === false) {
                $currentStatusIndex = 0;
            }

            for ($i = 0; $i <= min($currentStatusIndex, $numHistories - 1); $i++) {
                $status = $statusFlow[$i];
                $previousStatus = $i > 0 ? $statusFlow[$i - 1] : null;

                $approvalFlow = ['pending', 'in_progress', 'approved'];
                $approvalIndex = min($i, count($approvalFlow) - 1);

                $daysLost = $injury->days_lost;
                $oldDaysLost = $i > 0 ? $daysLost - rand(1, min(10, $daysLost)) : null;

                LostTimeInjuryHistory::create([
                    'lost_time_injury_id' => $injury->id,
                    'old_status' => $previousStatus,
                    'new_status' => $status,
                    'old_approval_status' => $i > 0 ? $approvalFlow[$approvalIndex - 1] : null,
                    'new_approval_status' => $approvalFlow[$approvalIndex],
                    'old_days_lost' => $oldDaysLost,
                    'new_days_lost' => $daysLost,
                    'notes' => $this->getStatusChangeNotes($status),
                    'updated_by' => Employee::inRandomOrder()->first()?->id,
                    'created_at' => $injury->created_at->addDays($i * 3),
                    'updated_at' => $injury->created_at->addDays($i * 3),
                ]);

                $historyCount++;
            }
        }

        $this->command->info('✅ ' . $historyCount . ' status history records created');
    }

    private function getStatusChangeNotes($status)
    {
        $notes = [
            'reported' => ['Injury reported', 'New LTI recorded'],
            'under_investigation' => ['Investigation started', 'Assigned to safety officer'],
            'in_review' => ['Under review by management', 'Reviewing findings'],
            'resolved' => ['Resolution implemented', 'Return to work approved'],
            'closed' => ['Case closed', 'File archived'],
            'rejected' => ['Claim rejected', 'Insufficient evidence'],
        ];

        $statusNotes = $notes[$status] ?? ['Status updated'];
        return $statusNotes[array_rand($statusNotes)];
    }

    private function getApprovalStatusByInjuryStatus($status)
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

    private function generateInjuryTitle()
    {
        $actions = [
            'Injury',
            'Accident',
            'Incident',
            'Workplace Injury',
            'Occupational Injury',
            'Work-related Injury'
        ];

        $bodyParts = ['Back', 'Hand', 'Foot', 'Arm', 'Leg', 'Head', 'Shoulder'];
        $injuryTypes = ['Fracture', 'Sprain', 'Laceration', 'Burn', 'Strain'];

        $faker = Faker::create();
        return $faker->randomElement($actions) . ' - ' .
            $faker->randomElement($bodyParts) . ' ' .
            $faker->randomElement($injuryTypes);
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
            'Total LTIs' => LostTimeInjury::count(),
            'Reported' => LostTimeInjury::where('status', 'reported')->count(),
            'Under Investigation' => LostTimeInjury::where('status', 'under_investigation')->count(),
            'In Review' => LostTimeInjury::where('status', 'in_review')->count(),
            'Resolved' => LostTimeInjury::where('status', 'resolved')->count(),
            'Closed' => LostTimeInjury::where('status', 'closed')->count(),
            'Rejected' => LostTimeInjury::where('status', 'rejected')->count(),
            'Total Days Lost' => LostTimeInjury::sum('days_lost'),
            'Average Days Lost' => round(LostTimeInjury::avg('days_lost'), 2),
            'Histories' => LostTimeInjuryHistory::count(),
        ];

        $this->command->info("\n📊 Lost Time Injury Summary:");
        foreach ($stats as $key => $value) {
            $this->command->info("   • {$key}: {$value}");
        }

        // By body part
        $this->command->info("\n📂 By Body Part:");
        $bodyParts = LostTimeInjury::selectRaw('body_part, COUNT(*) as count, SUM(days_lost) as total_days')
            ->whereNotNull('body_part')
            ->groupBy('body_part')
            ->orderBy('count', 'desc')
            ->get();
        foreach ($bodyParts as $part) {
            $this->command->info("   • {$part->body_part}: {$part->count} injuries, {$part->total_days} days lost");
        }

        // By injury type
        $this->command->info("\n⚠️ By Injury Type:");
        $injuryTypes = LostTimeInjury::selectRaw('injury_type, COUNT(*) as count')
            ->whereNotNull('injury_type')
            ->groupBy('injury_type')
            ->orderBy('count', 'desc')
            ->get();
        foreach ($injuryTypes as $type) {
            $this->command->info("   • {$type->injury_type}: {$type->count}");
        }

        // By severity
        $this->command->info("\n📊 By Severity:");
        $severities = LostTimeInjury::selectRaw('severity, COUNT(*) as count, AVG(days_lost) as avg_days')
            ->whereNotNull('severity')
            ->groupBy('severity')
            ->get();
        foreach ($severities as $severity) {
            $this->command->info("   • {$severity->severity}: {$severity->count} injuries, avg {$severity->avg_days} days lost");
        }
    }
}
