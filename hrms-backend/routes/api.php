<?php

use App\Http\Controllers\Api\ApplicationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\PositionController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\EmployeeCardController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\CandidateController;
use App\Http\Controllers\Api\WorkScheduleController;
use App\Http\Controllers\Api\DailyReportController;
use App\Http\Controllers\Api\EmployeeAssetController;
use App\Http\Controllers\Api\EmployeeDocumentController;
use App\Http\Controllers\Api\EmployeeOfficeController;
use App\Http\Controllers\Api\OfficeLocationController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\PPECategoryController;
use App\Http\Controllers\Api\PPEController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TurnoverReportController;
use App\Http\Controllers\Api\VacancyController;

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
Route::middleware('auth:api')->group(function () {

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

    // Employee Assets
    Route::get('/employee-assets', [EmployeeAssetController::class, 'index']);
    Route::get('/employee-assets/{id}', [EmployeeAssetController::class, 'show']);
    Route::post('/employee-assets/assign', [EmployeeAssetController::class, 'assign']);
    Route::post('/employee-assets/{id}/return', [EmployeeAssetController::class, 'return']);
    Route::post('/employee-assets/replace', [EmployeeAssetController::class, 'replace']);
    Route::get('/employee-assets/history/{employeeId}', [EmployeeAssetController::class, 'history']);

    // Employee Documents
    Route::get('/employees/{employeeId}/documents', [EmployeeDocumentController::class, 'index']);
    Route::post('/employees/{employeeId}/documents', [EmployeeDocumentController::class, 'store']);
    Route::delete('/employee-documents/{id}', [EmployeeDocumentController::class, 'destroy']);

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

    // PPE Routes
    Route::get('/ppe/categories', [PPEController::class, 'categories']);
    Route::get('/ppe/stats', [PPEController::class, 'stats']);

    Route::get('/ppe', [PPEController::class, 'index']);
    Route::get('/ppe/{id}', [PPEController::class, 'show']);
    Route::get('/ppe/{id}/history', [PPEController::class, 'history']);
    Route::post('/ppe', [PPEController::class, 'store']);
    Route::put('/ppe/{id}', [PPEController::class, 'update']);

    Route::delete('/ppe/{id}', [PPEController::class, 'destroy']);
    Route::post('/ppe/{id}/assign', [PPEController::class, 'assign']);
    Route::post('/ppe/{id}/return', [PPEController::class, 'return']);
    Route::post('/ppe/{id}/move', [PPEController::class, 'move']);
    Route::post('/ppe/{id}/write-off', [PPEController::class, 'writeOff']);

    // PPE Categories (FULL CRUD)
    Route::get('/ppe/categories', [PPECategoryController::class, 'index']);
    Route::get('/ppe/categories/{id}', [PPECategoryController::class, 'show']);
    Route::post('/ppe/categories', [PPECategoryController::class, 'store']);
    Route::put('/ppe/categories/{id}', [PPECategoryController::class, 'update']);
    Route::delete('/ppe/categories/{id}', [PPECategoryController::class, 'destroy']);

    // ==========================================
    // 🔥 RECRUITMENT ROUTES - Ikuti Format Leaves
    // ==========================================

    // Candidates
    Route::get('/candidates', [CandidateController::class, 'index']);
    Route::get('/candidates/stats', [CandidateController::class, 'stats']);
    Route::get('/candidates/cv', [CandidateController::class, 'getWithCV']);
    Route::post('/candidates', [CandidateController::class, 'store']);
    Route::get('/candidates/{id}', [CandidateController::class, 'show']);
    Route::put('/candidates/{id}', [CandidateController::class, 'update']);
    Route::delete('/candidates/{id}', [CandidateController::class, 'destroy']);
    Route::post('/candidates/{id}/cv', [CandidateController::class, 'uploadCV']);
    Route::put('/candidates/{id}/status', [CandidateController::class, 'updateStatus']);
    Route::get('/candidates/{id}/applications', [CandidateController::class, 'getApplications']);
    Route::get('/candidates/{id}/history', [CandidateController::class, 'getHistory']);

    // Vacancies
    Route::get('/vacancies', [VacancyController::class, 'index']);
    Route::get('/vacancies/stats', [VacancyController::class, 'stats']);
    Route::post('/vacancies', [VacancyController::class, 'store']);
    Route::get('/vacancies/{id}', [VacancyController::class, 'show']);
    Route::put('/vacancies/{id}', [VacancyController::class, 'update']);
    Route::delete('/vacancies/{id}', [VacancyController::class, 'destroy']);
    Route::put('/vacancies/{id}/status', [VacancyController::class, 'updateStatus']);
    Route::get('/vacancies/{id}/applications', [VacancyController::class, 'getApplications']);

    // Applications
    Route::get('/applications', [ApplicationController::class, 'index']);
    Route::get('/applications/stats', [ApplicationController::class, 'stats']);
    Route::post('/applications', [ApplicationController::class, 'store']);
    Route::get('/applications/{id}', [ApplicationController::class, 'show']);
    Route::put('/applications/{id}', [ApplicationController::class, 'update']);
    Route::delete('/applications/{id}', [ApplicationController::class, 'destroy']);
    Route::put('/applications/{id}/status', [ApplicationController::class, 'updateStatus']);
    Route::get('/applications/{id}/history', [ApplicationController::class, 'getStatusHistory']);
    Route::get('/applications/candidate/{candidateId}', [ApplicationController::class, 'getByCandidate']);
    Route::get('/applications/vacancy/{vacancyId}', [ApplicationController::class, 'getByVacancy']);
    Route::post('/applications/bulk-status', [ApplicationController::class, 'bulkUpdateStatus']);

    // Onboarding
    Route::get('/onboarding', [OnboardingController::class, 'index']);
    Route::get('/onboarding/stats', [OnboardingController::class, 'stats']);
    Route::post('/onboarding', [OnboardingController::class, 'store']);
    Route::get('/onboarding/{id}', [OnboardingController::class, 'show']);
    Route::put('/onboarding/{id}', [OnboardingController::class, 'update']);
    Route::delete('/onboarding/{id}', [OnboardingController::class, 'destroy']);
    Route::put('/onboarding/{id}/status', [OnboardingController::class, 'updateStatus']);
    Route::get('/onboarding/{id}/history', [OnboardingController::class, 'getStatusHistory']);
    Route::put('/onboarding/{id}/progress', [OnboardingController::class, 'updateProgress']);
    Route::put('/onboarding/{id}/tasks', [OnboardingController::class, 'updateTasks']);
    Route::put('/onboarding/{id}/tasks/{taskIndex}/toggle', [OnboardingController::class, 'toggleTask']);

    // Recruitment Dashboard
    Route::get('/recruitment/dashboard', [CandidateController::class, 'dashboard']);
    Route::get('/recruitment/pipeline', [CandidateController::class, 'pipeline']);
    Route::get('/recruitment/metrics', [CandidateController::class, 'metrics']);
    Route::get('/recruitment/status-options', [CandidateController::class, 'statusOptions']);
    Route::get('/recruitment/document-types', [CandidateController::class, 'documentTypes']);
});
