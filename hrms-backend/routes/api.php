<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\PositionController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\EmployeeCardController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\WorkScheduleController;
use App\Http\Controllers\Api\DailyReportController;
use App\Http\Controllers\Api\EmployeeOfficeController;
use App\Http\Controllers\Api\OfficeLocationController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TurnoverReportController;

// ==========================================
// TEST
// ==========================================
Route::get('/test', fn() => response()->json([
    'status' => 'success',
    'message' => 'HRMS API is working!',
    'timestamp' => now(),
]));

// ==========================================
// PUBLIC
// ==========================================
Route::post('/login', [AuthController::class, 'login']);


// Card attendance (no auth required)
Route::post('/attendance/card/check-in', [AttendanceController::class, 'checkInWithCard']);
Route::post('/attendance/card/check-out', [AttendanceController::class, 'checkOutWithCard']);

// Export CSV
Route::get('/export/leaves', [ReportController::class, 'exportLeaveCSV']);
Route::get('/export/attendance/daily', [ReportController::class, 'exportDailyAttendanceCSV']);
Route::get('/export/attendance/monthly', [ReportController::class, 'exportMonthlyAttendanceCSV']);

// ==========================================
// PROTECTED
// ==========================================
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [AuthController::class, 'profile']);

    // Reports - Turnover
    Route::get('/reports/turnover', [TurnoverReportController::class, 'stats']);
    Route::get('/reports/turnover/resigned', [TurnoverReportController::class, 'resigned']);
    Route::get('/reports/turnover/by-department', [TurnoverReportController::class, 'byDepartment']);
    Route::get('/reports/turnover/by-month', [TurnoverReportController::class, 'byMonth']);
    Route::get('/reports/turnover/summary', [TurnoverReportController::class, 'summary']);

    // Employees
    Route::apiResource('employees', EmployeeController::class);
    Route::put('/employees/{id}/card', [EmployeeCardController::class, 'assignCard']);
    Route::delete('/employees/{id}/card', [EmployeeCardController::class, 'removeCard']);

    // Employee Office Assignments
    Route::get('/employee-offices', [EmployeeOfficeController::class, 'getEmployeeOffices']);
    Route::post('/employee-offices/assign', [EmployeeOfficeController::class, 'assignOffice']);
    Route::delete('/employee-offices/{id}', [EmployeeOfficeController::class, 'removeOffice']);
    Route::get('/office/{id}/employees', [EmployeeOfficeController::class, 'getOfficeEmployees']);

    // Departments
    Route::get('/departments', [DepartmentController::class, 'index']);
    Route::get('/departments/{id}', [DepartmentController::class, 'show']);
    Route::get('/departments/{id}/positions', [DepartmentController::class, 'positions']);
    Route::post('/departments', [DepartmentController::class, 'store']);      // ✅ CREATE
    Route::put('/departments/{id}', [DepartmentController::class, 'update']);  // ✅ UPDATE
    Route::delete('/departments/{id}', [DepartmentController::class, 'destroy']); // ✅ DELETE

    // Positions
    Route::get('/positions', [PositionController::class, 'index']);
    Route::get('/positions/{id}', [PositionController::class, 'show']);
    Route::post('/positions', [PositionController::class, 'store']);          // ✅ CREATE - INI YANG HILANG
    Route::put('/positions/{id}', [PositionController::class, 'update']);     // ✅ UPDATE
    Route::delete('/positions/{id}', [PositionController::class, 'destroy']); // ✅ DELETE

    // Attendance
    Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut']);
    Route::get('/attendance/today', [AttendanceController::class, 'today']);
    Route::get('/attendance/report', [AttendanceController::class, 'report']);
    Route::get('/attendance/history', [AttendanceController::class, 'history']);

    // Schedules
    Route::get('/schedules', [WorkScheduleController::class, 'index']);
    Route::post('/schedules', [WorkScheduleController::class, 'store']);
    Route::get('/schedules/{id}', [WorkScheduleController::class, 'show']);
    Route::put('/schedules/{id}', [WorkScheduleController::class, 'update']);
    Route::delete('/schedules/{id}', [WorkScheduleController::class, 'destroy']);
    Route::post('/schedules/assign', [WorkScheduleController::class, 'assignToEmployee']);
    Route::post('/schedules/bulk-assign', [WorkScheduleController::class, 'bulkAssign']);
    Route::get('/employee-schedules', [WorkScheduleController::class, 'getEmployeeSchedules']);
    Route::get('/current-schedule', [WorkScheduleController::class, 'getCurrentSchedule']);
    Route::delete('/employee-schedules/{id}', [WorkScheduleController::class, 'removeAssignment']);


    Route::get('/leaves/balance', [LeaveController::class, 'balance']);  // Get my balance
    Route::get('/leaves/all-balances', [LeaveController::class, 'allBalances']); // Admin view all
    Route::get('/leaves/balance/{id}', [LeaveController::class, 'getBalanceDetail']); // Get single balance by ID
    Route::put('/leaves/balance/{id}', [LeaveController::class, 'updateBalance']); // Update balance
    Route::get('/leaves/balance/{employeeId}/history', [LeaveController::class, 'getAdjustmentHistory']);

    // Leaves
    Route::get('/leaves', [LeaveController::class, 'index']);
    Route::post('/leaves', [LeaveController::class, 'store']);
    Route::get('/leaves/balance', [LeaveController::class, 'balance']);
    Route::get('/leaves/all-balances', [LeaveController::class, 'allBalances']); // Admin only
    Route::get('/leave-types', [LeaveController::class, 'leaveTypes']);
    Route::put('/leaves/{id}/approve', [LeaveController::class, 'approve']);
    Route::put('/leaves/{id}/reject', [LeaveController::class, 'reject']);
    Route::get('/leaves/pending', [LeaveController::class, 'pendingRequests']);

    // Replacement Leave
    Route::get('/replacement-leaves', [LeaveController::class, 'replacementList']);
    Route::post('/replacement-leaves', [LeaveController::class, 'requestReplacement']);
    Route::put('/replacement-leaves/{id}/approve', [LeaveController::class, 'approveReplacement']);
    Route::put('/replacement-leaves/{id}/reject', [LeaveController::class, 'rejectReplacement']);
    Route::put('/leaves/{id}/cancel', [LeaveController::class, 'cancel']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Public Holidays
    Route::get('/public-holidays', [LeaveController::class, 'publicHolidays']);

    // Daily Report
    Route::get('/daily-report', [DailyReportController::class, 'dailyReport']);
    Route::put('/attendance/{id}', [DailyReportController::class, 'updateAttendance']);
    Route::put('/attendance-session/{id}', [DailyReportController::class, 'updateSession']);

    // Office Locations
    Route::get('/office-locations', [OfficeLocationController::class, 'index']);
    Route::get('/office-locations/all', [OfficeLocationController::class, 'all']);
    Route::post('/office-locations', [OfficeLocationController::class, 'store']);
    Route::put('/office-locations/{id}', [OfficeLocationController::class, 'update']);
    Route::patch('/office-locations/{id}/toggle', [OfficeLocationController::class, 'toggle']);
    Route::delete('/office-locations/{id}', [OfficeLocationController::class, 'destroy']);

    // Reports
    Route::get('/reports/leaves', [ReportController::class, 'leaveReport']);
    Route::get('/reports/leave-balance', [ReportController::class, 'leaveBalanceReport']);
    Route::get('/reports/attendance/daily', [ReportController::class, 'dailyAttendance']);
    Route::get('/reports/attendance/monthly', [ReportController::class, 'monthlyAttendance']);
});
