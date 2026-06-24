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
        $leaveTypes = [
            ['name' => 'Annual Leave', 'code' => 'ANNUAL', 'days_per_year' => 18, 'color' => '#4CAF50'],
            ['name' => 'Sick Leave', 'code' => 'SICK', 'days_per_year' => 10, 'color' => '#F44336'],
            ['name' => 'Emergency Leave', 'code' => 'EMERGENCY', 'days_per_year' => 5, 'color' => '#FF9800'],
            ['name' => 'Maternity Leave', 'code' => 'MATERNITY', 'days_per_year' => 90, 'color' => '#E91E63'],
            ['name' => 'Paternity Leave', 'code' => 'PATERNITY', 'days_per_year' => 7, 'color' => '#2196F3'],
            ['name' => 'Compassionate Leave', 'code' => 'COMPASSIONATE', 'days_per_year' => 5, 'color' => '#9C27B0'],
            ['name' => 'Unpaid Leave', 'code' => 'UNPAID', 'days_per_year' => 0, 'color' => '#607D8B'],
            ['name' => 'Study Leave', 'code' => 'STUDY', 'days_per_year' => 5, 'color' => '#00BCD4'],
            ['name' => 'Public Holiday', 'code' => 'PUBLIC', 'days_per_year' => 0, 'color' => '#8BC34A'],
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

        if (!$employee) return;

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

            Leave::create([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType?->id ?? 1,
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
        $stats = [
            'Total Leaves' => Leave::count(),
            'Pending' => Leave::where('status', 'pending')->count(),
            'Approved' => Leave::where('status', 'approved')->count(),
            'Rejected' => Leave::where('status', 'rejected')->count(),
            'Cancelled' => Leave::where('status', 'cancelled')->count(),
        ];

        $this->command->info("\n📊 Leave Summary:");
        foreach ($stats as $key => $value) {
            $this->command->info("   • {$key}: {$value}");
        }

        // By leave type
        $this->command->info("\n📂 By Leave Type:");
        $leaveTypes = Leave::selectRaw('leave_type_id, COUNT(*) as count')
            ->groupBy('leave_type_id')
            ->with('leaveType')
            ->get();
        foreach ($leaveTypes as $type) {
            $this->command->info("   • {$type->leaveType->name}: {$type->count}");
        }
    }
}
