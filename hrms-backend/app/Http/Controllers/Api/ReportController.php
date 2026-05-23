<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Leave;
use App\Models\LeaveBalance;
use App\Models\ReplacementLeave;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * Leave Report
     */
    public function leaveReport(Request $request): JsonResponse
    {
        $query = Leave::with(['employee.department', 'leaveType', 'approvedBy']);

        // Filter by employee
        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by department
        if ($request->department_id) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('department_id', $request->department_id);
            });
        }

        // Filter by leave type
        if ($request->leave_type_id) {
            $query->where('leave_type_id', $request->leave_type_id);
        }

        // Filter by status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->from_date && $request->to_date) {
            $query->whereBetween('start_date', [$request->from_date, $request->to_date]);
        } elseif ($request->month && $request->year) {
            $query->whereMonth('start_date', $request->month)
                ->whereYear('start_date', $request->year);
        }

        $perPage = $request->per_page ?? 50;
        $leaves = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Summary
        $summary = [
            'total_requests' => $leaves->total(),
            'approved' => $leaves->where('status', 'approved')->count(),
            'rejected' => $leaves->where('status', 'rejected')->count(),
            'pending' => $leaves->where('status', 'pending')->count(),
            'total_days' => $leaves->sum('total_days'),
        ];

        return response()->json([
            'status' => 'success',
            'data' => [
                'leaves' => $leaves,
                'summary' => $summary,
            ],
        ]);
    }

    /**
     * Leave Balance Report (Summary per employee)
     */
    public function leaveBalanceReport(Request $request): JsonResponse
    {
        $query = Employee::with(['department', 'leaveBalances.leaveType'])
            ->where('status', 'active');

        if ($request->department_id) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->employee_id) {
            $query->where('id', $request->employee_id);
        }

        $employees = $query->get();

        $report = $employees->map(function ($employee) {
            $balances = $employee->leaveBalances->map(function ($balance) {
                return [
                    'leave_type' => $balance->leaveType->name ?? 'N/A',
                    'total' => $balance->total_days + $balance->carry_forward_days + $balance->seniority_bonus_days + $balance->replacement_days,
                    'used' => $balance->used_days,
                    'pending' => $balance->pending_days,
                    'remaining' => $balance->remaining_days,
                ];
            });

            return [
                'id' => $employee->id,
                'employee_id' => $employee->employee_id,
                'name' => $employee->first_name . ' ' . $employee->last_name,
                'department' => $employee->department->name ?? 'N/A',
                'balances' => $balances,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $report,
        ]);
    }

    /**
     * Daily Attendance Report
     */
    public function dailyAttendance(Request $request): JsonResponse
    {
        $date = $request->date ?? Carbon::today()->format('Y-m-d');
        $departmentId = $request->department_id;
        $employeeId = $request->employee_id;

        $query = Attendance::with(['employee.department', 'sessions'])
            ->whereDate('date', $date);

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        if ($departmentId) {
            $query->whereHas('employee', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        $attendances = $query->get();

        $report = $attendances->map(function ($attendance) {
            $sessions = $attendance->sessions->map(function ($session) {
                return [
                    'session_number' => $session->session_number,
                    'check_in' => $session->check_in_time,
                    'check_out' => $session->check_out_time,
                    'hours' => $session->session_hours,
                    'status' => $session->status,
                    'is_late' => $session->is_late,
                    'late_minutes' => $session->late_minutes,
                ];
            });

            return [
                'employee_id' => $attendance->employee->employee_id ?? 'N/A',
                'employee_name' => $attendance->employee->first_name . ' ' . $attendance->employee->last_name,
                'department' => $attendance->employee->department->name ?? 'N/A',
                'date' => $attendance->date->format('Y-m-d'),
                'status' => $attendance->status,
                'first_check_in' => $attendance->first_check_in,
                'last_check_out' => $attendance->last_check_out,
                'total_hours' => $attendance->total_hours,
                'overtime_hours' => $attendance->overtime_hours,
                'total_sessions' => $attendance->total_sessions,
                'sessions' => $sessions,
            ];
        });

        // Summary
        $allEmployees = Employee::where('status', 'active');
        if ($departmentId) $allEmployees->where('department_id', $departmentId);
        if ($employeeId) $allEmployees->where('id', $employeeId);
        $totalEmployees = $allEmployees->count();

        $summary = [
            'date' => $date,
            'total_employees' => $totalEmployees,
            'present' => $attendances->whereIn('status', ['present', 'late'])->count(),
            'absent' => $totalEmployees - $attendances->count(),
            'late' => $attendances->where('status', 'late')->count(),
            'on_time' => $attendances->where('status', 'present')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => [
                'report' => $report,
                'summary' => $summary,
            ],
        ]);
    }

    /**
     * Monthly Attendance Report
     */
    public function monthlyAttendance(Request $request): JsonResponse
    {
        $month = $request->month ?? Carbon::now()->month;
        $year = $request->year ?? Carbon::now()->year;
        $departmentId = $request->department_id;
        $employeeId = $request->employee_id;

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        // Get all active employees
        $employeeQuery = Employee::where('status', 'active');
        if ($departmentId) $employeeQuery->where('department_id', $departmentId);
        if ($employeeId) $employeeQuery->where('id', $employeeId);
        $employees = $employeeQuery->with('department')->get();

        // Get all attendances for the month
        $attendances = Attendance::with('sessions')
            ->whereBetween('date', [$startDate, $endDate]);

        if ($employeeId) {
            $attendances->where('employee_id', $employeeId);
        } elseif ($departmentId) {
            $attendances->whereHas('employee', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        $attendances = $attendances->get()->keyBy('employee_id');

        $workingDays = $this->getWorkingDays($startDate, $endDate);

        $report = $employees->map(function ($employee) use ($attendances, $workingDays) {
            $attendance = $attendances->get($employee->id);

            return [
                'employee_id' => $employee->employee_id,
                'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                'department' => $employee->department->name ?? 'N/A',
                'working_days' => $workingDays,
                'present_days' => $attendance ? ($attendance->status == 'present' || $attendance->status == 'late' ? 1 : 0) : 0,
                'absent_days' => $attendance ? 0 : $workingDays,
                'late_days' => $attendance && $attendance->status == 'late' ? 1 : 0,
                'total_hours' => $attendance ? $attendance->total_hours : 0,
                'overtime_hours' => $attendance ? $attendance->overtime_hours : 0,
                'total_sessions' => $attendance ? $attendance->total_sessions : 0,
            ];
        });

        // Calculate proper summary
        $totalPresent = $report->where('present_days', '>', 0)->count();
        $totalAbsent = $report->where('present_days', 0)->count();
        $totalLate = $report->where('late_days', '>', 0)->count();

        $summary = [
            'month' => $month,
            'year' => $year,
            'working_days' => $workingDays,
            'total_employees' => $employees->count(),
            'present' => $totalPresent,
            'absent' => $totalAbsent,
            'late' => $totalLate,
            'total_hours' => round($report->sum('total_hours'), 2),
            'total_overtime' => round($report->sum('overtime_hours'), 2),
            'total_sessions' => $report->sum('total_sessions'),
            'attendance_rate' => $employees->count() > 0
                ? round(($totalPresent / $employees->count()) * 100, 2)
                : 0,
        ];

        return response()->json([
            'status' => 'success',
            'data' => [
                'report' => $report,
                'summary' => $summary,
            ],
        ]);
    }

    /**
     * Export CSV - Leave Report
     */
    public function exportLeaveCSV(Request $request)
    {
        $query = Leave::with(['employee.department', 'leaveType']);

        if ($request->employee_id) $query->where('employee_id', $request->employee_id);
        if ($request->department_id) $query->whereHas('employee', fn($q) => $q->where('department_id', $request->department_id));
        if ($request->from_date && $request->to_date) $query->whereBetween('start_date', [$request->from_date, $request->to_date]);
        if ($request->status) $query->where('status', $request->status);

        $leaves = $query->orderBy('created_at', 'desc')->get();

        $filename = 'leave_report_' . date('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($leaves) {
            $file = fopen('php://output', 'w');

            // Add BOM for Excel UTF-8 compatibility
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Header
            fputcsv($file, [
                'Leave #',
                'Employee ID',
                'Employee Name',
                'Department',
                'Leave Type',
                'Start Date',
                'End Date',
                'Total Days',
                'Reason',
                'Status',
                'Approved By',
                'Created At',
            ]);

            // Data
            foreach ($leaves as $leave) {
                fputcsv($file, [
                    $leave->leave_number,
                    $leave->employee->employee_id ?? 'N/A',
                    $leave->employee->first_name . ' ' . $leave->employee->last_name,
                    $leave->employee->department->name ?? 'N/A',
                    $leave->leaveType->name ?? 'N/A',
                    $leave->start_date->format('Y-m-d'),
                    $leave->end_date->format('Y-m-d'),
                    $leave->total_days,
                    '"' . str_replace('"', '""', $leave->reason ?? '') . '"',
                    $leave->status,
                    $leave->approvedBy ? $leave->approvedBy->first_name . ' ' . $leave->approvedBy->last_name : 'N/A',
                    $leave->created_at->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export CSV - Daily Attendance
     */
    public function exportDailyAttendanceCSV(Request $request)
    {
        $date = $request->date ?? Carbon::today()->format('Y-m-d');

        $query = Attendance::with(['employee.department', 'sessions'])
            ->whereDate('date', $date);

        if ($request->employee_id) $query->where('employee_id', $request->employee_id);
        if ($request->department_id) $query->whereHas('employee', fn($q) => $q->where('department_id', $request->department_id));

        $attendances = $query->get();

        $filename = 'daily_attendance_' . $date . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($attendances) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($file, [
                'Employee ID',
                'Employee Name',
                'Department',
                'Date',
                'Status',
                'Session 1 Check In',
                'Session 1 Check Out',
                'Session 1 Hours',
                'Session 2 Check In',
                'Session 2 Check Out',
                'Session 2 Hours',
                'Total Hours',
                'Overtime Hours',
                'Late',
            ]);

            foreach ($attendances as $att) {
                $s1 = $att->sessions->where('session_number', 1)->first();
                $s2 = $att->sessions->where('session_number', 2)->first();

                fputcsv($file, [
                    $att->employee->employee_id ?? 'N/A',
                    $att->employee->first_name . ' ' . $att->employee->last_name,
                    $att->employee->department->name ?? 'N/A',
                    $att->date->format('Y-m-d'),
                    $att->status,
                    $s1->check_in_time ?? '-',
                    $s1->check_out_time ?? '-',
                    $s1->session_hours ?? 0,
                    $s2->check_in_time ?? '-',
                    $s2->check_out_time ?? '-',
                    $s2->session_hours ?? 0,
                    $att->total_hours,
                    $att->overtime_hours,
                    $att->status == 'late' ? 'Yes' : 'No',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export CSV - Monthly Attendance
     */
    public function exportMonthlyAttendanceCSV(Request $request)
    {
        $month = $request->month ?? Carbon::now()->month;
        $year = $request->year ?? Carbon::now()->year;
        $departmentId = $request->department_id;
        $employeeId = $request->employee_id;

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $employeeQuery = Employee::where('status', 'active');
        if ($departmentId) $employeeQuery->where('department_id', $departmentId);
        if ($employeeId) $employeeQuery->where('id', $employeeId);
        $employees = $employeeQuery->with('department')->get();

        $attendances = Attendance::whereBetween('date', [$startDate, $endDate]);
        if ($departmentId) $attendances->whereHas('employee', fn($q) => $q->where('department_id', $departmentId));
        if ($employeeId) $attendances->where('employee_id', $employeeId);
        $attendances = $attendances->get()->keyBy('employee_id');

        $workingDays = $this->getWorkingDays($startDate, $endDate);

        $filename = 'monthly_attendance_' . $year . '_' . str_pad($month, 2, '0', STR_PAD_LEFT) . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($employees, $attendances, $workingDays) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($file, [
                'Employee ID',
                'Employee Name',
                'Department',
                'Working Days',
                'Present Days',
                'Absent Days',
                'Late Days',
                'Total Hours',
                'Overtime Hours',
                'Total Sessions',
                'Attendance Rate (%)',
            ]);

            foreach ($employees as $emp) {
                $att = $attendances->get($emp->id);
                $presentDays = $att ? 1 : 0;
                $absentDays = $workingDays - $presentDays;
                $rate = $workingDays > 0 ? round(($presentDays / $workingDays) * 100, 2) : 0;

                fputcsv($file, [
                    $emp->employee_id,
                    $emp->first_name . ' ' . $emp->last_name,
                    $emp->department->name ?? 'N/A',
                    $workingDays,
                    $presentDays,
                    $absentDays,
                    $att && $att->status == 'late' ? 1 : 0,
                    $att ? $att->total_hours : 0,
                    $att ? $att->overtime_hours : 0,
                    $att ? $att->total_sessions : 0,
                    $rate,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Calculate working days in a month
     */
    private function getWorkingDays($start, $end): int
    {
        $days = 0;
        $current = $start->copy();
        while ($current <= $end) {
            if (!$current->isWeekend()) $days++;
            $current->addDay();
        }
        return $days;
    }
}
