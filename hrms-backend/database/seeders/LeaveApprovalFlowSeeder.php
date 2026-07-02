<?php
// database/seeders/LeaveApprovalFlowSeeder.php

namespace Database\Seeders;

use App\Models\LeaveApprovalFlow;
use Illuminate\Database\Seeder;

class LeaveApprovalFlowSeeder extends Seeder
{
    public function run(): void
    {
        $flows = [
            [
                'department_id' => null,
                'position_id' => null,
                'level' => 1,
                'approver_type' => 'manager',
                'approver_id' => null,
                'is_active' => true,
            ],
            [
                'department_id' => null,
                'position_id' => null,
                'level' => 2,
                'approver_type' => 'hr',
                'approver_id' => null,
                'is_active' => true,
            ],
            [
                'department_id' => null,
                'position_id' => null,
                'level' => 3,
                'approver_type' => 'director',
                'approver_id' => null,
                'is_active' => true,
            ],
        ];

        foreach ($flows as $flow) {
            LeaveApprovalFlow::create($flow);
        }

        // Same for replacement
        $replacementFlows = [
            [
                'department_id' => null,
                'position_id' => null,
                'level' => 1,
                'approver_type' => 'manager',
                'approver_id' => null,
                'is_active' => true,
            ],
            [
                'department_id' => null,
                'position_id' => null,
                'level' => 2,
                'approver_type' => 'hr',
                'approver_id' => null,
                'is_active' => true,
            ],
        ];

        foreach ($replacementFlows as $flow) {
            \App\Models\ReplacementApprovalFlow::create($flow);
        }

        $this->command->info('✅ Approval flows seeded successfully!');
    }
}