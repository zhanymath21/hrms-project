<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\WorkSchedule;
use App\Models\EmployeeSchedule;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Holiday;
use App\Models\Employee;
use Carbon\Carbon;

class AttendanceSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📝 Creating attendance records...');

        // Create work schedules
        $this->createWorkSchedules();

        // Create holidays
        $this->createHolidays();

        // Get employees
        $employees = Employee::all();

        if ($employees->isEmpty()) {
            $this->command->warn('⚠️ No employees found. Please run EmployeeSeeder first.');
            return;
        }

        // Assign schedules to employees
        $this->assignSchedulesToEmployees($employees);

        // Create attendance records for last 3 months
        $this->createAttendanceRecords($employees);

        // Create attendance sessions
        $this->createAttendanceSessions();

        $this->displaySummary();
    }

    private function createWorkSchedules()
    {
        $schedules = [
            [
                'name' => 'Morning Shift',
                'code' => 'SHIFT-PAGI',
                'start_time' => '08:00:00',
                'end_time' => '17:00:00',
                'break_start_time' => '12:00:00',
                'break_end_time' => '13:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
                'working_days' => [1, 2, 3, 4, 5],
                'is_overnight' => false,
                'is_active' => true,
                'description' => 'Standard morning shift from 8 AM to 5 PM',
            ],
            [
                'name' => 'Night Shift',
                'code' => 'SHIFT-MALAM',
                'start_time' => '22:00:00',
                'end_time' => '07:00:00',
                'break_start_time' => '02:00:00',
                'break_end_time' => '03:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
                'working_days' => [1, 2, 3, 4, 5],
                'is_overnight' => true,
                'is_active' => true,
                'description' => 'Night shift from 10 PM to 7 AM',
            ],
            [
                'name' => 'Flexible Shift',
                'code' => 'SHIFT-FLEKSI',
                'start_time' => '09:00:00',
                'end_time' => '18:00:00',
                'break_start_time' => '13:00:00',
                'break_end_time' => '14:00:00',
                'break_duration_minutes' => 60,
                'total_working_hours' => 8,
                'working_days' => [1, 2, 3, 4, 5],
                'is_overnight' => false,
                'is_active' => true,
                'description' => 'Flexible shift with core hours 9 AM to 6 PM',
            ],
        ];

        foreach ($schedules as $schedule) {
            WorkSchedule::updateOrCreate(
                ['code' => $schedule['code']],
                $schedule
            );
        }

        $this->command->info('✅ ' . WorkSchedule::count() . ' work schedules created');
    }

    private function createHolidays()
    {
        $holidays = [
            ['name' => 'New Year\'s Day', 'date' => Carbon::now()->startOfYear()->format('Y-m-d')],
            ['name' => 'International Women\'s Day', 'date' => Carbon::now()->startOfYear()->addMonths(2)->addDays(7)->format('Y-m-d')],
            ['name' => 'Khmer New Year', 'date' => Carbon::now()->startOfYear()->addMonths(3)->addDays(12)->format('Y-m-d')],
            ['name' => 'Labour Day', 'date' => Carbon::now()->startOfYear()->addMonths(4)->startOfMonth()->format('Y-m-d')],
            ['name' => 'King\'s Birthday', 'date' => Carbon::now()->startOfYear()->addMonths(4)->addDays(12)->format('Y-m-d')],
            ['name' => 'Independence Day', 'date' => Carbon::now()->startOfYear()->addMonths(10)->addDays(8)->format('Y-m-d')],
            ['name' => 'Water Festival', 'date' => Carbon::now()->startOfYear()->addMonths(10)->addDays(13)->format('Y-m-d')],
            ['name' => 'Human Rights Day', 'date' => Carbon::now()->startOfYear()->addMonths(11)->addDays(9)->format('Y-m-d')],
        ];

        foreach ($holidays as $holiday) {
            Holiday::updateOrCreate(
                ['date' => $holiday['date']],
                [
                    'name' => $holiday['name'],
                    'description' => 'National holiday',
                    'is_recurring' => true,
                    'is_active' => true,
                ]
            );
        }

        $this->command->info('✅ ' . Holiday::count() . ' holidays created');
    }

    private function assignSchedulesToEmployees($employees)
    {
        $schedules = WorkSchedule::all();

        foreach ($employees as $employee) {
            // Assign a random schedule to each employee
            $schedule = $schedules->random();

            EmployeeSchedule::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'is_active' => true,
                ],
                [
                    'work_schedule_id' => $schedule->id,
                    'start_date' => Carbon::now()->subMonths(3),
                    'end_date' => null,
                    'notes' => 'Default schedule assignment',
                ]
            );
        }

        $this->command->info('✅ ' . EmployeeSchedule::count() . ' employee schedules created');
    }

    private function createAttendanceRecords($employees)
    {
        $this->command->info('📝 Creating attendance records...');

        $startDate = Carbon::now()->subMonths(3);
        $endDate = Carbon::now();

        $attendanceCount = 0;

        foreach ($employees as $employee) {
            $date = $startDate->copy();

            while ($date <= $endDate) {
                // Skip weekends (Saturday and Sunday)
                if ($date->isWeekend()) {
                    $date->addDay();
                    continue;
                }

                // Check if it's a holiday
                $isHoliday = Holiday::where('date', $date->format('Y-m-d'))->exists();

                if ($isHoliday) {
                    $status = 'holiday';
                    $totalHours = 0;
                } else {
                    // Random status
                    $statuses = ['present', 'present', 'present', 'late', 'absent'];
                    $status = $statuses[array_rand($statuses)];

                    $totalHours = match ($status) {
                        'present' => rand(7, 9),
                        'late' => rand(5, 7),
                        default => 0,
                    };
                }

                Attendance::updateOrCreate(
                    [
                        'employee_id' => $employee->id,
                        'date' => $date->format('Y-m-d'),
                    ],
                    [
                        'status' => $status,
                        'total_hours' => $totalHours,
                        'overtime_hours' => rand(0, 2),
                        'total_sessions' => $status === 'present' || $status === 'late' ? rand(1, 2) : 0,
                        'first_check_in' => $status === 'present' || $status === 'late' ? '08:00:00' : null,
                        'last_check_out' => $status === 'present' || $status === 'late' ? '17:00:00' : null,
                        'is_approved' => true,
                        'approved_by' => Employee::inRandomOrder()->first()?->id,
                        'remarks' => $status === 'absent' ? 'No attendance recorded' : null,
                    ]
                );

                $attendanceCount++;
                $date->addDay();
            }
        }

        $this->command->info('✅ ' . $attendanceCount . ' attendance records created');
    }

    private function createAttendanceSessions()
    {
        $this->command->info('📝 Creating attendance sessions...');

        $attendances = Attendance::whereIn('status', ['present', 'late'])->get();
        $sessionCount = 0;

        foreach ($attendances as $attendance) {
            // Create 1-2 sessions per day
            $numSessions = rand(1, 2);

            for ($i = 0; $i < $numSessions; $i++) {
                $checkInTime = $i === 0 ? '08:00:00' : '13:00:00';
                $checkOutTime = $i === 0 ? '12:00:00' : '17:00:00';

                AttendanceSession::updateOrCreate(
                    [
                        'attendance_id' => $attendance->id,
                        'session_number' => $i + 1,
                    ],
                    [
                        'employee_id' => $attendance->employee_id,
                        'work_schedule_id' => WorkSchedule::inRandomOrder()->first()?->id,
                        'date' => $attendance->date,
                        'session_number' => $i + 1,
                        'check_in_time' => $checkInTime,
                        'check_out_time' => $checkOutTime,
                        'session_hours' => 4,
                        'schedule_start_time' => '08:00:00',
                        'schedule_end_time' => '17:00:00',
                        'is_late' => false,
                        'late_minutes' => 0,
                        'is_early_leave' => false,
                        'early_leave_minutes' => 0,
                        'status' => 'completed',
                        'notes' => 'Regular attendance session',
                    ]
                );

                $sessionCount++;
            }
        }

        $this->command->info('✅ ' . $sessionCount . ' attendance sessions created');
    }

    private function displaySummary()
    {
        $stats = [
            'Work Schedules' => WorkSchedule::count(),
            'Employee Schedules' => EmployeeSchedule::count(),
            'Attendance Records' => Attendance::count(),
            'Attendance Sessions' => AttendanceSession::count(),
            'Holidays' => Holiday::count(),
        ];

        $this->command->info("\n📊 Attendance System Summary:");
        foreach ($stats as $key => $value) {
            $this->command->info("   • {$key}: {$value}");
        }

        // Attendance status distribution
        $this->command->info("\n📂 Attendance Status:");
        $statuses = Attendance::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();
        foreach ($statuses as $status) {
            $this->command->info("   • {$status->status}: {$status->count}");
        }
    }
}
