<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\LostTimeInjury;
use Illuminate\Database\Eloquent\Factories\Factory;

class LostTimeInjuryFactory extends Factory
{
    protected $model = LostTimeInjury::class;

    public function definition()
    {
        $statuses = ['reported', 'under_investigation', 'in_review', 'resolved', 'closed', 'rejected'];
        $severities = ['Minor', 'Moderate', 'Severe', 'Critical'];

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

        $employee = Employee::inRandomOrder()->first();
        $reportedBy = Employee::inRandomOrder()->first();
        $createdBy = Employee::inRandomOrder()->first();

        $injuryDate = $this->faker->dateTimeBetween('-6 months', 'now');
        $daysLost = $this->faker->numberBetween(1, 90);
        $returnToWorkDate = $this->faker->optional(0.6)->dateTimeBetween($injuryDate, '+3 months');

        $status = $this->faker->randomElement($statuses);
        $resolvedDate = ($status === 'resolved' || $status === 'closed')
            ? $this->faker->dateTimeBetween($injuryDate, 'now')
            : null;

        return [
            // Foreign Keys
            'employee_id' => $employee?->id,
            'reported_by' => $reportedBy?->id,
            'created_by' => $createdBy?->id ?? 1,

            // Basic Information
            'title' => $this->generateInjuryTitle(),
            'description' => $this->faker->paragraphs(3, true),
            'location' => $this->faker->randomElement([
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
            'injury_time' => $this->faker->optional(0.8)->time('H:i:s'),

            // Injury Details
            'body_part' => $this->faker->randomElement($bodyParts),
            'injury_type' => $this->faker->randomElement($injuryTypes),
            'severity' => $this->faker->randomElement($severities),

            // Medical Information
            'medical_treatment' => $this->faker->boolean(80),
            'return_to_work_date' => $returnToWorkDate,
            'days_lost' => $daysLost,
            'medical_notes' => $this->faker->optional(0.7)->paragraphs(2, true),

            // Status
            'status' => $status,

            // Resolution
            'resolution_notes' => ($status === 'resolved' || $status === 'closed')
                ? $this->faker->paragraphs(2, true)
                : null,
            'resolved_date' => $resolvedDate,

            // Files
            'file_path' => $this->faker->optional(0.3)->filePath(),
            'file_name' => $this->faker->optional(0.3)->word . '.pdf',

            // Witnesses
            'witnesses' => $this->generateWitnesses(),

            // Approval Flow
            'approval_flow' => $this->generateApprovalFlow(),

            // Manager Approvals
            'manager1_id' => $this->getRandomManager(),
            'manager1_status' => $this->faker->randomElement(['pending', 'approved', 'rejected']),
            'manager1_approved_at' => $this->faker->optional(0.5)->dateTimeBetween('-30 days', 'now'),
            'manager1_notes' => $this->faker->optional(0.3)->sentence,

            'manager2_id' => $this->getRandomManager(),
            'manager2_status' => $this->faker->randomElement(['pending', 'approved', 'rejected']),
            'manager2_approved_at' => $this->faker->optional(0.4)->dateTimeBetween('-30 days', 'now'),
            'manager2_notes' => $this->faker->optional(0.3)->sentence,

            'manager3_id' => $this->getRandomManager(),
            'manager3_status' => $this->faker->randomElement(['pending', 'approved', 'rejected']),
            'manager3_approved_at' => $this->faker->optional(0.3)->dateTimeBetween('-30 days', 'now'),
            'manager3_notes' => $this->faker->optional(0.3)->sentence,

            'manager4_id' => $this->getRandomManager(),
            'manager4_status' => $this->faker->randomElement(['pending', 'approved', 'rejected']),
            'manager4_approved_at' => $this->faker->optional(0.2)->dateTimeBetween('-30 days', 'now'),
            'manager4_notes' => $this->faker->optional(0.3)->sentence,

            // Overall Approval Status
            'approval_status' => $this->faker->randomElement([
                'pending',
                'in_progress',
                'approved',
                'rejected',
                'partially_approved'
            ]),

            'created_at' => $injuryDate,
            'updated_at' => $injuryDate,
        ];
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

        return $this->faker->randomElement($actions) . ' - ' .
            $this->faker->randomElement($bodyParts) . ' ' .
            $this->faker->randomElement($injuryTypes);
    }

    private function generateWitnesses()
    {
        $witnesses = [];
        $numWitnesses = $this->faker->numberBetween(0, 4);

        for ($i = 0; $i < $numWitnesses; $i++) {
            $employee = Employee::inRandomOrder()->first();
            if ($employee) {
                $witnesses[] = [
                    'employee_id' => $employee->id,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department?->name,
                    'phone' => $employee->phone,
                    'email' => $employee->email,
                    'statement' => $this->faker->optional(0.5)->sentence,
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
            if ($this->faker->boolean(40)) {
                $status = $this->faker->randomElement(['approved', 'rejected']);
            } elseif ($this->faker->boolean(30)) {
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

    /**
     * Indicate that the injury is reported.
     */
    public function reported()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'reported',
                'approval_status' => 'pending',
                'resolved_date' => null,
                'resolution_notes' => null,
            ];
        });
    }

    /**
     * Indicate that the injury is under investigation.
     */
    public function underInvestigation()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'under_investigation',
                'approval_status' => 'in_progress',
            ];
        });
    }

    /**
     * Indicate that the injury is resolved.
     */
    public function resolved()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'resolved',
                'approval_status' => 'approved',
                'resolved_date' => now(),
                'resolution_notes' => $this->faker->paragraphs(2, true),
            ];
        });
    }

    /**
     * Set a specific severity.
     */
    public function severity($level)
    {
        return $this->state(function (array $attributes) use ($level) {
            return ['severity' => $level];
        });
    }

    /**
     * Set a specific body part.
     */
    public function bodyPart($part)
    {
        return $this->state(function (array $attributes) use ($part) {
            return ['body_part' => $part];
        });
    }

    /**
     * Set specific days lost.
     */
    public function daysLost($days)
    {
        return $this->state(function (array $attributes) use ($days) {
            return ['days_lost' => $days];
        });
    }
}
