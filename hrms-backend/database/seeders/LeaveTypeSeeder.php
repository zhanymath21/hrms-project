<?php
// database/seeders/LeaveTypeSeeder.php

namespace Database\Seeders;

use App\Models\LeaveType;
use Illuminate\Database\Seeder;

class LeaveTypeSeeder extends Seeder
{
    public function run(): void
    {
        $leaveTypes = [
            [
                'code' => 'AL',
                'name' => 'Annual Leave',
                'description' => 'Regular annual leave for employees',
                'days_per_year' => 12,
                'is_paid' => true,
                'allow_carry_forward' => true,
                'max_carry_forward_days' => 6,
                'is_active' => true,
                'require_attachment' => false,
            ],
            [
                'code' => 'SL',
                'name' => 'Sick Leave',
                'description' => 'Leave due to sickness or medical reasons',
                'days_per_year' => 14,
                'is_paid' => true,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
                'require_attachment' => true,
            ],
            [
                'code' => 'SPL',
                'name' => 'Special Leave',
                'description' => 'Special occasions like marriage, birth, etc.',
                'days_per_year' => 3,
                'is_paid' => true,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
                'require_attachment' => false,
            ],
            [
                'code' => 'UL',
                'name' => 'Unpaid Leave',
                'description' => 'Unpaid leave for personal reasons',
                'days_per_year' => 0,
                'is_paid' => false,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
                'require_attachment' => false,
            ],
        ];

        foreach ($leaveTypes as $type) {
            LeaveType::updateOrCreate(
                ['code' => $type['code']],
                $type
            );
        }

        $this->command->info('✅ Leave types seeded successfully!');
    }
}