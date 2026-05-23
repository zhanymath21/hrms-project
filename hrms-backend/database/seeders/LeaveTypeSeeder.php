<?php

namespace Database\Seeders;

use App\Models\LeaveType;
use Illuminate\Database\Seeder;

class LeaveTypeSeeder extends Seeder
{
    public function run()
    {
        $leaveTypes = [
            [
                'code' => 'AL',
                'name' => 'Annual Leave',
                'description' => 'Cuti tahunan untuk liburan atau istirahat',
                'days_per_year' => 18,
                'is_paid' => true,
                'allow_carry_forward' => true,
                'max_carry_forward_days' => 6,
                'is_active' => true,
            ],
            [
                'code' => 'SL',
                'name' => 'Sick Leave',
                'description' => 'Cuti sakit dengan surat dokter',
                'days_per_year' => 12,
                'is_paid' => true,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ],
            [
                'code' => 'SPL',
                'name' => 'Special Leave',
                'description' => 'Cuti khusus untuk keperluan penting (nikah, dll)',
                'days_per_year' => 7,
                'is_paid' => true,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ],
        ];

        foreach ($leaveTypes as $type) {
            LeaveType::updateOrCreate(['code' => $type['code']], $type);
        }
    }
}
