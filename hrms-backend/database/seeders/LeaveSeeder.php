<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\Employee;
use Carbon\Carbon;

class LeaveSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📝 Creating leave records...');

        // Create leave types if they don't exist
        $this->createLeaveTypes();

        // Get all employees
        $employees = Employee::all();

        if ($employees->isEmpty()) {
            $this->command->warn('⚠️ No employees found. Please run EmployeeSeeder first.');
            return;
        }

        // Create 50 leave records
        Leave::factory(50)->create();

        // Create specific leave records
        $this->createSpecificLeaves();

        $this->displaySummary();
    }

    private function createLeaveTypes()
    {
        // No 'color' column - matches your migration exactly
        $leaveTypes = [
            [
                'name' => 'Annual Leave',
                'code' => 'ANNUAL',
                'description' => 'Annual paid leave for employees',
                'days_per_year' => 18,
                'is_paid' => true,
                'allow_carry_forward' => true,
                'max_carry_forward_days' => 6,
                'is_active' => true,
            ],
            [
                'name' => 'Sick Leave',
                'code' => 'SICK',
                'description' => 'Sick leave with medical certificate',
                'days_per_year' => 10,
                'is_paid' => true,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ],
            [
                'name' => 'Emergency Leave',
                'code' => 'EMERGENCY',
                'description' => 'Emergency leave for urgent matters',
                'days_per_year' => 5,
                'is_paid' => true,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ],
            [
                'name' => 'Maternity Leave',
                'code' => 'MATERNITY',
                'description' => 'Maternity leave for expecting mothers',
                'days_per_year' => 90,
                'is_paid' => true,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ],
            [
                'name' => 'Paternity Leave',
                'code' => 'PATERNITY',
                'description' => 'Paternity leave for new fathers',
                'days_per_year' => 7,
                'is_paid' => true,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ],
            [
                'name' => 'Compassionate Leave',
                'code' => 'COMPASSIONATE',
                'description' => 'Leave for bereavement or family emergencies',
                'days_per_year' => 5,
                'is_paid' => true,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ],
            [
                'name' => 'Unpaid Leave',
                'code' => 'UNPAID',
                'description' => 'Unpaid leave for personal reasons',
                'days_per_year' => 0,
                'is_paid' => false,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ],
            [
                'name' => 'Study Leave',
                'code' => 'STUDY',
                'description' => 'Leave for educational purposes',
                'days_per_year' => 5,
                'is_paid' => false,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ],
            [
                'name' => 'Public Holiday',
                'code' => 'PUBLIC',
                'description' => 'Public holidays',
                'days_per_year' => 0,
                'is_paid' => true,
                'allow_carry_forward' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ],
        ];

        foreach ($leaveTypes as $type) {
            LeaveType::updateOrCreate(
                ['code' => $type['code']],
                $type
            );
        }

        $this->command->info('✅ ' . LeaveType::count() . ' leave types created');
    }

    private function createSpecificLeaves()
    {
        $employee = Employee::inRandomOrder()->first();

        if (!$employee) {
            $this->command->warn('⚠️ No employees found for specific leaves.');
            return;
        }

        $specificLeaves = [
            [
                'start_date' => Carbon::now()->addDays(5),
                'end_date' => Carbon::now()->addDays(7),
                'total_days' => 3,
                'reason' => 'Family vacation. Planning to visit relatives in the province.',
                'status' => 'pending',
                'leave_type' => 'ANNUAL',
            ],
            [
                'start_date' => Carbon::now()->subDays(2),
                'end_date' => Carbon::now()->subDays(1),
                'total_days' => 2,
                'reason' => 'Feeling unwell with flu symptoms. Need rest.',
                'status' => 'approved',
                'leave_type' => 'SICK',
            ],
            [
                'start_date' => Carbon::now()->subDays(5),
                'end_date' => Carbon::now()->subDays(3),
                'total_days' => 3,
                'reason' => 'Family emergency - need to attend to urgent family matter.',
                'status' => 'approved',
                'leave_type' => 'EMERGENCY',
            ],
            [
                'start_date' => Carbon::now()->addDays(10),
                'end_date' => Carbon::now()->addDays(12),
                'total_days' => 3,
                'reason' => 'Professional development training - attending a workshop in the city.',
                'status' => 'pending',
                'leave_type' => 'STUDY',
            ],
            [
                'start_date' => Carbon::now()->addDays(20),
                'end_date' => Carbon::now()->addDays(25),
                'total_days' => 6,
                'reason' => 'Annual leave for personal vacation with family.',
                'status' => 'rejected',
                'leave_type' => 'ANNUAL',
                'rejection_reason' => 'This period is during peak season. Please reschedule.',
            ],
        ];

        foreach ($specificLeaves as $data) {
            $leaveType = LeaveType::where('code', $data['leave_type'])->first();

            if (!$leaveType) {
                $this->command->warn("⚠️ Leave type '{$data['leave_type']}' not found. Skipping.");
                continue;
            }

            Leave::create([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'total_days' => $data['total_days'],
                'reason' => $data['reason'],
                'status' => $data['status'],
                'rejection_reason' => $data['rejection_reason'] ?? null,
                'approved_by' => $data['status'] === 'approved' ? Employee::inRandomOrder()->first()?->id : null,
                'approved_at' => $data['status'] === 'approved' ? now() : null,
            ]);
        }
    }

    private function displaySummary()
    {
        $totalLeaves = Leave::count();

        if ($totalLeaves === 0) {
            $this->command->info("\n📊 No leave records found.");
            return;
        }

        $stats = [
            'Total Leaves' => $totalLeaves,
            'Pending' => Leave::where('status', 'pending')->count(),
            'Approved' => Leave::where('status', 'approved')->count(),
            'Rejected' => Leave::where('status', 'rejected')->count(),
            'Cancelled' => Leave::where('status', 'cancelled')->count(),
        ];

        $this->command->info("\n📊 ========================================");
        $this->command->info("📊 LEAVE SUMMARY");
        $this->command->info("📊 ========================================");

        $this->command->info("\n📈 Overview:");
        foreach ($stats as $key => $value) {
            $this->command->info("   • {$key}: {$value}");
        }

        // By leave type
        $this->command->info("\n📂 By Leave Type:");
        $leaveTypes = Leave::selectRaw('leave_type_id, COUNT(*) as count')
            ->groupBy('leave_type_id')
            ->with('leaveType')
            ->get();

        if ($leaveTypes->isNotEmpty()) {
            foreach ($leaveTypes as $type) {
                $percentage = round(($type->count / $totalLeaves) * 100, 1);
                $bar = str_repeat('█', (int)($percentage / 5));
                $this->command->info("   • {$type->leaveType->name}: {$type->count} ({$percentage}%) {$bar}");
            }
        }

        $this->command->info("\n📊 ========================================");
    }
}
