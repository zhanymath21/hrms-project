<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\IncidentReport;
use Illuminate\Database\Eloquent\Factories\Factory;

class IncidentReportFactory extends Factory
{
    protected $model = IncidentReport::class;

    public function definition()
    {
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
        $statuses = ['reported', 'under_investigation', 'in_review', 'resolved', 'closed', 'rejected'];

        $reportedBy = Employee::inRandomOrder()->first();
        $createdBy = Employee::inRandomOrder()->first();
        $assignedTo = Employee::inRandomOrder()->first();

        // Random date within last 6 months
        $incidentDate = $this->faker->dateTimeBetween('-6 months', 'now');
        $resolvedDate = $this->faker->optional(0.4)->dateTimeBetween($incidentDate, 'now');

        // Status logic
        $status = $this->faker->randomElement($statuses);
        if ($status === 'resolved' || $status === 'closed') {
            $resolvedDate = $this->faker->dateTimeBetween($incidentDate, 'now');
        }

        // Generate witnesses
        $witnesses = $this->generateWitnesses();

        // Generate approval flow
        $approvalFlow = $this->generateApprovalFlow();

        return [
            // Basic Information
            'title' => $this->generateIncidentTitle(),
            'description' => $this->faker->paragraphs(3, true),
            'location' => $this->faker->randomElement([
                'Main Office - Floor 3',
                'Warehouse A',
                'Factory Floor',
                'Parking Lot',
                'Cafeteria',
                'Meeting Room 1',
                'IT Department',
                'HR Office',
                'Security Gate',
                'Storage Room',
            ]),
            'incident_date' => $incidentDate,
            'incident_time' => $this->faker->optional(0.8)->time('H:i:s'),

            // Category & Severity
            'category' => $this->faker->randomElement($categories),
            'severity' => $this->faker->randomElement($severities),

            // Status
            'status' => $status,

            // Resolution
            'resolution_notes' => $status === 'resolved' || $status === 'closed'
                ? $this->faker->paragraphs(2, true)
                : null,
            'resolved_date' => $resolvedDate,

            // Files
            'file_path' => $this->faker->optional(0.3)->filePath(),
            'file_name' => $this->faker->optional(0.3)->word . '.pdf',

            // Witnesses
            'witnesses' => $witnesses,

            // Approval Flow
            'approval_flow' => $approvalFlow,

            // Foreign Keys
            'reported_by' => $reportedBy?->id,
            'assigned_to' => $assignedTo?->id,
            'created_by' => $createdBy?->id ?? 1,

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

            'created_at' => $incidentDate,
            'updated_at' => $incidentDate,
        ];
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

        $locations = [
            'at Warehouse',
            'on Factory Floor',
            'at Main Office',
            'during Shift',
            'during Meeting',
            'at Parking Lot'
        ];

        return $this->faker->randomElement($titles) . ' ' .
            $this->faker->randomElement($actions) . ' ' .
            $this->faker->optional(0.5)->randomElement($locations);
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

        // Randomly approve some levels
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
        // Get employees with manager positions
        $manager = Employee::whereIn('position_id', [1, 3, 4]) // HR Manager, IT Manager, Finance Manager
            ->inRandomOrder()
            ->first();

        return $manager?->id;
    }

    /**
     * Indicate that the incident is reported.
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
     * Indicate that the incident is under investigation.
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
     * Indicate that the incident is resolved.
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
     * Indicate that the incident is closed.
     */
    public function closed()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'closed',
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
     * Set a specific category.
     */
    public function category($category)
    {
        return $this->state(function (array $attributes) use ($category) {
            return ['category' => $category];
        });
    }
}
