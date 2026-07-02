<?php
// database/seeders/ReplacementApprovalFlowSeeder.php

namespace Database\Seeders;

use App\Models\ReplacementApprovalFlow;
use Illuminate\Database\Seeder;

class ReplacementApprovalFlowSeeder extends Seeder
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
        ];

        foreach ($flows as $flow) {
            ReplacementApprovalFlow::updateOrCreate(
                [
                    'level' => $flow['level'],
                    'approver_type' => $flow['approver_type'],
                ],
                $flow
            );
        }

        $this->command->info('✅ Replacement approval flows seeded successfully!');
    }
}