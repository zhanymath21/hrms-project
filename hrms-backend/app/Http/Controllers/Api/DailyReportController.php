<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyReportController extends Controller
{
    /**
     * Get daily attendance report with sessions detail
     */
    public function dailyReport(Request $request): JsonResponse
    {
        $date = $request->date ?? Carbon::today()->format('Y-m-d');
        $departmentId = $request->department_id;

        // Get all active employees with schedules
        $query = Employee::with([
            'department',
            'position',
            'activeSchedule.workSchedule'
        ])->where('status', 'active');

        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }

        $employees = $query->get();

        // Get ALL attendance records for the date with sessions
        $attendances = Attendance::with(['sessions' => function ($query) {
            $query->orderBy('session_number', 'asc');
        }])
            ->whereDate('date', $date)
            ->get()
            ->keyBy('employee_id');

        // Build report data
        $report = [];
        foreach ($employees as $employee) {
            $attendance = $attendances->get($employee->id);
            $schedule = $employee->activeSchedule?->workSchedule;

            // Initialize session data
            $session1 = null;
            $session2 = null;

            if ($attendance && $attendance->sessions->count() > 0) {
                // Get sessions ordered by session_number
                $sessions = $attendance->sessions->sortBy('session_number')->values();

                // Session 1
                if (isset($sessions[0])) {
                    $session1 = [
                        'check_in_time' => $sessions[0]->check_in_time,
                        'check_out_time' => $sessions[0]->check_out_time,
                        'session_hours' => $sessions[0]->session_hours ?? 0,
                        'status' => $sessions[0]->status,
                        'is_late' => $sessions[0]->is_late ?? false,
                        'late_minutes' => $sessions[0]->late_minutes ?? 0,
                    ];
                }

                // Session 2
                if (isset($sessions[1])) {
                    $session2 = [
                        'check_in_time' => $sessions[1]->check_in_time,
                        'check_out_time' => $sessions[1]->check_out_time,
                        'session_hours' => $sessions[1]->session_hours ?? 0,
                        'status' => $sessions[1]->status,
                        'is_late' => $sessions[1]->is_late ?? false,
                        'late_minutes' => $sessions[1]->late_minutes ?? 0,
                    ];
                }
            }

            $report[] = [
                'employee_id' => $employee->id,
                'employee_code' => $employee->employee_id,
                'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                'department' => $employee->department?->name ?? '-',
                'position' => $employee->position?->title ?? '-',
                'shift_name' => $schedule?->name ?? 'No Schedule',
                'shift_start' => $schedule?->start_time ?? null,
                'shift_end' => $schedule?->end_time ?? null,
                'status' => $attendance?->status ?? 'absent',
                'total_hours' => (float)($attendance?->total_hours ?? 0),
                'overtime' => (float)($attendance?->overtime_hours ?? 0),
                'total_sessions' => (int)($attendance?->total_sessions ?? 0),

                // Session 1 Data
                'session1_check_in' => $session1 ? substr($session1['check_in_time'], 0, 5) : '-',
                'session1_check_out' => $session1 ? ($session1['check_out_time'] ? substr($session1['check_out_time'], 0, 5) : '-') : '-',
                'session1_hours' => (float)($session1['session_hours'] ?? 0),
                'session1_status' => $session1['status'] ?? 'none',
                'session1_late' => $session1['is_late'] ?? false,
                'session1_late_minutes' => (int)($session1['late_minutes'] ?? 0),

                // Session 2 Data
                'session2_check_in' => $session2 ? substr($session2['check_in_time'], 0, 5) : '-',
                'session2_check_out' => $session2 ? ($session2['check_out_time'] ? substr($session2['check_out_time'], 0, 5) : '-') : '-',
                'session2_hours' => (float)($session2['session_hours'] ?? 0),
                'session2_status' => $session2['status'] ?? 'none',
                'session2_late' => $session2['is_late'] ?? false,
                'session2_late_minutes' => (int)($session2['late_minutes'] ?? 0),
            ];
        }

        // Summary
        $summary = [
            'date' => $date,
            'total_employees' => $employees->count(),
            'present' => collect($report)->whereIn('status', ['present', 'late'])->count(),
            'absent' => collect($report)->where('status', 'absent')->count(),
            'late' => collect($report)->where('status', 'late')->count(),
            'on_time' => collect($report)->where('status', 'present')->count(),
            'total_hours' => round(collect($report)->sum('total_hours'), 2),
            'total_overtime' => round(collect($report)->sum('overtime'), 2),
        ];

        return response()->json([
            'status' => 'success',
            'data' => [
                'summary' => $summary,
                'report' => $report,
            ],
        ]);
    }

    /**
     * Admin edit attendance session
     */
    public function updateSession(Request $request, $id): JsonResponse
    {
        $session = AttendanceSession::find($id);

        if (!$session) {
            return response()->json([
                'status' => 'error',
                'message' => 'Session not found',
            ], 404);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'check_in_time' => 'nullable|date_format:H:i',
            'check_out_time' => 'nullable|date_format:H:i',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->only(['check_in_time', 'check_out_time']);

        // Recalculate hours if both times provided
        if ($request->check_in_time && $request->check_out_time) {
            $checkIn = Carbon::parse($request->check_in_time);
            $checkOut = Carbon::parse($request->check_out_time);

            // Handle overnight shift
            if ($checkOut->lt($checkIn)) {
                $checkOut->addDay();
            }

            $data['session_hours'] = round($checkIn->diffInMinutes($checkOut) / 60, 2);
            $data['status'] = 'completed';
        }

        $session->update($data);

        // Recalculate attendance totals
        $attendance = $session->attendance;
        $totalHours = $attendance->sessions()
            ->where('status', 'completed')
            ->sum('session_hours');
        $overtime = max(0, $totalHours - 8);
        $completedSessions = $attendance->sessions()
            ->where('status', 'completed')
            ->count();

        $attendance->update([
            'total_hours' => round($totalHours, 2),
            'overtime_hours' => round($overtime, 2),
            'total_sessions' => $completedSessions,
            'last_check_out' => $session->check_out_time,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Session updated successfully',
            'data' => $session->fresh(),
        ]);
    }

    /**
     * Get single employee attendance for a date (for edit popup)
     */
    public function getEmployeeAttendance(Request $request): JsonResponse
    {
        $employeeId = $request->employee_id;
        $date = $request->date ?? Carbon::today()->format('Y-m-d');

        $attendance = Attendance::with(['sessions' => function ($query) {
            $query->orderBy('session_number', 'asc');
        }])
            ->where('employee_id', $employeeId)
            ->whereDate('date', $date)
            ->first();

        if (!$attendance) {
            return response()->json([
                'status' => 'error',
                'message' => 'No attendance found for this date',
            ], 404);
        }

        $employee = Employee::with('department')->find($employeeId);

        $sessions = $attendance->sessions->map(function ($session) {
            return [
                'id' => $session->id,
                'session_number' => $session->session_number,
                'check_in_time' => $session->check_in_time,
                'check_out_time' => $session->check_out_time,
                'session_hours' => $session->session_hours,
                'status' => $session->status,
                'is_late' => $session->is_late,
                'late_minutes' => $session->late_minutes,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => [
                'attendance_id' => $attendance->id,
                'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                'employee_code' => $employee->employee_id,
                'department' => $employee->department?->name,
                'date' => $date,
                'status' => $attendance->status,
                'total_hours' => $attendance->total_hours,
                'overtime_hours' => $attendance->overtime_hours,
                'sessions' => $sessions,
            ],
        ]);
    }
}