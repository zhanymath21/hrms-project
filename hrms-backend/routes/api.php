<?php
// routes/api.php

use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\ApprovalFlowController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\CandidateController;
use App\Http\Controllers\Api\DailyReportController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\EmployeeAssetController;
use App\Http\Controllers\Api\EmployeeCardController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\EmployeeDocumentController;
use App\Http\Controllers\Api\EmployeeOfficeController;
use App\Http\Controllers\Api\EmployeeSalarySettingController;
use App\Http\Controllers\Api\ExchangeRateController;
use App\Http\Controllers\Api\IncidentReportController;
use App\Http\Controllers\Api\LeaveBalanceController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\LostTimeInjuryController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OfficeLocationController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\PayrollAdjustmentController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\PayslipController;
use App\Http\Controllers\Api\PositionController;
use App\Http\Controllers\Api\PPECategoryController;
use App\Http\Controllers\Api\PPEController;
use App\Http\Controllers\Api\PPEExportController;
use App\Http\Controllers\Api\PPEImportController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReplacementLeaveController;
use App\Http\Controllers\Api\TaxSettingController;
use App\Http\Controllers\Api\TurnoverReportController;
use App\Http\Controllers\Api\VacancyController;
use App\Http\Controllers\Api\WorkScheduleController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ==========================================
// TEST ROUTE
// ==========================================
Route::get('/test', fn() => response()->json([
    'status' => 'success',
    'message' => 'HRMS API is working!',
    'timestamp' => now(),
]));

// ==========================================
// PUBLIC ROUTES (No authentication required)
// ==========================================
Route::post('/login', [AuthController::class, 'login']);

// Card attendance (Public - uses card number)
Route::prefix('attendance/card')->group(function () {
    Route::post('/check-in', [AttendanceController::class, 'checkInWithCard']);
    Route::post('/check-out', [AttendanceController::class, 'checkOutWithCard']);
});

// Public exports
Route::prefix('export')->group(function () {
    Route::get('/leaves', [ReportController::class, 'exportLeaveCSV']);
    Route::get('/attendance/daily', [ReportController::class, 'exportDailyAttendanceCSV']);
    Route::get('/attendance/monthly', [ReportController::class, 'exportMonthlyAttendanceCSV']);
});

// PPE Export
Route::get('/ppe/export', [PPEExportController::class, 'export']);

// Employee imports/exports (Public)
Route::prefix('employees')->group(function () {
    Route::get('/export', [EmployeeController::class, 'export'])->name('employees.export');
    Route::post('/import', [EmployeeController::class, 'import'])->name('employees.import');
    Route::get('/import/template', [EmployeeController::class, 'downloadTemplate'])->name('employees.template');
});

// ==========================================
// PROTECTED ROUTES (Authentication required)
// ==========================================
Route::middleware('auth:api')->group(function () {

    // ==========================================
    // AUTH & PROFILE
    // ==========================================
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/profile', [AuthController::class, 'profile']);
    });

    // ==========================================
    // ✅ LEAVE BALANCE - OUTSIDE employees PREFIX
    // ==========================================
    // These routes are at /api/xxx to avoid conflict with /api/employees/{id}

    // My balance (Employee) - GET /api/my-leave-balance
    Route::get('/my-leave-balance', [LeaveBalanceController::class, 'myBalance']);

    // All balances (Admin/HR) - GET /api/leave-balances
    Route::get('/leave-balances', [LeaveBalanceController::class, 'allBalances']);

    // Balance summary (Admin/HR) - GET /api/leave-balance-summary
    Route::get('/leave-balance-summary', [LeaveBalanceController::class, 'getBalanceSummary']);

    // Balance report (Admin/HR) - GET /api/leave-balance-report
    Route::get('/leave-balance-report', [LeaveBalanceController::class, 'getBalanceReport']);

    // Balance detail by ID (Admin/HR) - GET /api/leave-balance/{id}
    Route::get('/leave-balance/{id}', [LeaveBalanceController::class, 'getBalanceDetail']);

    // Update balance (Admin/HR) - PUT /api/leave-balance/{id}
    Route::put('/leave-balance/{id}', [LeaveBalanceController::class, 'updateBalance']);

    // Adjustment history for employee (Admin/HR) - GET /api/leave-balance-history/{employeeId}
    Route::get('/leave-balance-history/{employeeId}', [LeaveBalanceController::class, 'getAdjustmentHistory']);

    // Get balance for specific employee (Admin/HR) - GET /api/employee-balance/{employeeId}
    Route::get('/employee-balance/{employeeId}', [LeaveBalanceController::class, 'getEmployeeBalance']);

    // Generate balance (Admin/HR) - POST /api/generate-balance
    Route::post('/generate-balance', [LeaveBalanceController::class, 'generateBalance']);

    // Generate all balances (Admin/HR) - POST /api/generate-all-balances
    Route::post('/generate-all-balances', [LeaveBalanceController::class, 'generateAllBalances']);

    // Process carry forward (Admin/HR) - POST /api/process-carry-forward
    Route::post('/process-carry-forward', [LeaveBalanceController::class, 'processCarryForward']);

    // ==========================================
    // EMPLOYEE MANAGEMENT
    // ==========================================
    Route::prefix('employees')->group(function () {
        // CRUD
        Route::get('/', [EmployeeController::class, 'index']);
        Route::post('/', [EmployeeController::class, 'store']);
        Route::get('/{id}', [EmployeeController::class, 'show']);
        Route::put('/{id}', [EmployeeController::class, 'update']);
        Route::delete('/{id}', [EmployeeController::class, 'destroy']);

        // Card management
        Route::put('/{id}/card', [EmployeeCardController::class, 'assignCard']);
        Route::delete('/{id}/card', [EmployeeCardController::class, 'removeCard']);

        // Documents
        Route::get('/{employeeId}/documents', [EmployeeDocumentController::class, 'index']);
        Route::post('/{employeeId}/documents', [EmployeeDocumentController::class, 'store']);
    });

    // Employee Documents (Delete)
    Route::delete('/employee-documents/{id}', [EmployeeDocumentController::class, 'destroy']);

    // ==========================================
    // LEAVE REQUESTS
    // ==========================================
    Route::prefix('leaves')->group(function () {
        // Leave Types
        Route::get('/types', [LeaveController::class, 'leaveTypes']);

        // Leave Requests - CRUD
        Route::get('/', [LeaveController::class, 'index']);
        Route::get('/pending', [LeaveController::class, 'pendingRequests']);
        Route::get('/{id}', [LeaveController::class, 'show']);
        Route::post('/', [LeaveController::class, 'store']);

        // Leave Actions
        Route::put('/{id}/approve', [LeaveController::class, 'approve']);
        Route::put('/{id}/reject', [LeaveController::class, 'reject']);
        Route::put('/{id}/cancel', [LeaveController::class, 'cancel']);
        Route::get('/{id}/download-attachment', [LeaveController::class, 'downloadAttachment']);

        // Statistics & History
        Route::get('/statistics', [LeaveController::class, 'statistics']);
        Route::get('/my-history', [LeaveController::class, 'myHistory']);
        Route::get('/employee/{employeeId}', [LeaveController::class, 'employeeLeaves']);
    });

    // Public Holidays
    Route::get('/public-holidays', [LeaveController::class, 'publicHolidays']);

    // ==========================================
    // APPROVAL FLOW
    // ==========================================
    Route::prefix('approval-flow')->group(function () {
        Route::get('/', [ApprovalFlowController::class, 'index']);
        Route::post('/', [ApprovalFlowController::class, 'update']);
        Route::get('/employee/{employeeId}', [ApprovalFlowController::class, 'getEmployeeFlow']);
    });

    // ==========================================
    // REPLACEMENT LEAVES
    // ==========================================
    Route::prefix('replacement-leaves')->group(function () {
        Route::get('/', [ReplacementLeaveController::class, 'index']);
        Route::get('/pending-approvals', [ReplacementLeaveController::class, 'pendingApprovals']);
        Route::get('/{id}', [ReplacementLeaveController::class, 'show']);
        Route::post('/', [ReplacementLeaveController::class, 'store']);
        Route::put('/{id}/approve', [ReplacementLeaveController::class, 'approve']);
        Route::put('/{id}/reject', [ReplacementLeaveController::class, 'reject']);
        Route::put('/{id}/cancel', [ReplacementLeaveController::class, 'cancel']);
        Route::get('/{id}/download-attachment', [ReplacementLeaveController::class, 'downloadAttachment']);
    });

    // ==========================================
    // ATTENDANCE
    // ==========================================
    Route::prefix('attendance')->group(function () {
        Route::post('/check-in', [AttendanceController::class, 'checkIn']);
        Route::post('/check-out', [AttendanceController::class, 'checkOut']);
        Route::get('/today', [AttendanceController::class, 'today']);
        Route::get('/report', [AttendanceController::class, 'report']);
        Route::get('/history', [AttendanceController::class, 'history']);
    });

    // ==========================================
    // WORK SCHEDULES
    // ==========================================
    Route::prefix('schedules')->group(function () {
        Route::get('/', [WorkScheduleController::class, 'index']);
        Route::post('/', [WorkScheduleController::class, 'store']);
        Route::get('/{id}', [WorkScheduleController::class, 'show']);
        Route::put('/{id}', [WorkScheduleController::class, 'update']);
        Route::delete('/{id}', [WorkScheduleController::class, 'destroy']);
        Route::post('/assign', [WorkScheduleController::class, 'assignToEmployee']);
        Route::post('/bulk-assign', [WorkScheduleController::class, 'bulkAssign']);
        Route::get('/employee-schedules', [WorkScheduleController::class, 'getEmployeeSchedules']);
        Route::get('/current-schedule', [WorkScheduleController::class, 'getCurrentSchedule']);
        Route::delete('/employee-schedules/{id}', [WorkScheduleController::class, 'removeAssignment']);
    });

    // ==========================================
    // DEPARTMENTS
    // ==========================================
    Route::prefix('departments')->group(function () {
        Route::get('/', [DepartmentController::class, 'index']);
        Route::post('/', [DepartmentController::class, 'store']);
        Route::get('/{id}', [DepartmentController::class, 'show']);
        Route::get('/{id}/positions', [DepartmentController::class, 'positions']);
        Route::put('/{id}', [DepartmentController::class, 'update']);
        Route::delete('/{id}', [DepartmentController::class, 'destroy']);
    });

    // ==========================================
    // POSITIONS
    // ==========================================
    Route::prefix('positions')->group(function () {
        Route::get('/', [PositionController::class, 'index']);
        Route::post('/', [PositionController::class, 'store']);
        Route::get('/{id}', [PositionController::class, 'show']);
        Route::put('/{id}', [PositionController::class, 'update']);
        Route::delete('/{id}', [PositionController::class, 'destroy']);
    });

    // ==========================================
    // OFFICE LOCATIONS
    // ==========================================
    Route::prefix('office-locations')->group(function () {
        Route::get('/', [OfficeLocationController::class, 'index']);
        Route::get('/all', [OfficeLocationController::class, 'all']);
        Route::post('/', [OfficeLocationController::class, 'store']);
        Route::put('/{id}', [OfficeLocationController::class, 'update']);
        Route::patch('/{id}/toggle', [OfficeLocationController::class, 'toggle']);
        Route::delete('/{id}', [OfficeLocationController::class, 'destroy']);
    });

    // ==========================================
    // EMPLOYEE ASSETS
    // ==========================================
    Route::prefix('employee-assets')->group(function () {
        Route::get('/', [EmployeeAssetController::class, 'index']);
        Route::get('/{id}', [EmployeeAssetController::class, 'show']);
        Route::post('/assign', [EmployeeAssetController::class, 'assign']);
        Route::post('/{id}/return', [EmployeeAssetController::class, 'return']);
        Route::post('/replace', [EmployeeAssetController::class, 'replace']);
        Route::get('/history/{employeeId}', [EmployeeAssetController::class, 'history']);
    });

    // ==========================================
    // EMPLOYEE OFFICE ASSIGNMENTS
    // ==========================================
    Route::prefix('employee-offices')->group(function () {
        Route::get('/', [EmployeeOfficeController::class, 'getEmployeeOffices']);
        Route::post('/assign', [EmployeeOfficeController::class, 'assignOffice']);
        Route::delete('/{id}', [EmployeeOfficeController::class, 'removeOffice']);
    });
    Route::get('/office/{id}/employees', [EmployeeOfficeController::class, 'getOfficeEmployees']);

    // ==========================================
    // EMPLOYEE SALARY SETTINGS
    // ==========================================
    Route::prefix('employee-salary-settings')->group(function () {
        Route::get('/', [EmployeeSalarySettingController::class, 'index']);
        Route::get('/{employeeId}', [EmployeeSalarySettingController::class, 'show']);
        Route::post('/', [EmployeeSalarySettingController::class, 'store']);
        Route::put('/{employeeId}', [EmployeeSalarySettingController::class, 'update']);
        Route::delete('/{employeeId}', [EmployeeSalarySettingController::class, 'destroy']);
    });

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::put('/read-all', [NotificationController::class, 'markAllAsRead']);
    });

    // ==========================================
    // DAILY REPORT
    // ==========================================
    Route::prefix('daily-report')->group(function () {
        Route::get('/', [DailyReportController::class, 'dailyReport']);
        Route::put('/attendance/{id}', [DailyReportController::class, 'updateAttendance']);
        Route::put('/attendance-session/{id}', [DailyReportController::class, 'updateSession']);
    });

    // ==========================================
    // REPORTS
    // ==========================================
    Route::prefix('reports')->group(function () {
        // Leave reports
        Route::get('/leaves', [ReportController::class, 'leaveReport']);
        Route::get('/leave-balance', [ReportController::class, 'leaveBalanceReport']);

        // Attendance reports
        Route::prefix('attendance')->group(function () {
            Route::get('/daily', [ReportController::class, 'dailyAttendance']);
            Route::get('/monthly', [ReportController::class, 'monthlyAttendance']);
        });

        // Turnover reports
        Route::prefix('turnover')->group(function () {
            Route::get('/', [TurnoverReportController::class, 'stats']);
            Route::get('/resigned', [TurnoverReportController::class, 'resigned']);
            Route::get('/by-department', [TurnoverReportController::class, 'byDepartment']);
            Route::get('/by-month', [TurnoverReportController::class, 'byMonth']);
            Route::get('/summary', [TurnoverReportController::class, 'summary']);
        });
    });

    // ==========================================
    // PPE MANAGEMENT
    // ==========================================
    Route::prefix('ppe')->group(function () {
        // Categories
        Route::prefix('categories')->group(function () {
            Route::get('/', [PPECategoryController::class, 'index']);
            Route::post('/', [PPECategoryController::class, 'store']);
            Route::get('/{id}', [PPECategoryController::class, 'show']);
            Route::put('/{id}', [PPECategoryController::class, 'update']);
            Route::delete('/{id}', [PPECategoryController::class, 'destroy']);
        });

        // Items
        Route::get('/', [PPEController::class, 'index']);
        Route::post('/', [PPEController::class, 'store']);
        Route::get('/{id}', [PPEController::class, 'show']);
        Route::get('/{id}/history', [PPEController::class, 'history']);
        Route::put('/{id}', [PPEController::class, 'update']);
        Route::delete('/{id}', [PPEController::class, 'destroy']);
        Route::post('/{id}/assign', [PPEController::class, 'assign']);
        Route::post('/{id}/return', [PPEController::class, 'return']);
        Route::post('/{id}/move', [PPEController::class, 'move']);
        Route::post('/{id}/write-off', [PPEController::class, 'writeOff']);

        // Stats
        Route::get('/stats', [PPEController::class, 'stats']);

        // Import
        Route::prefix('import')->group(function () {
            Route::get('/template', [PPEImportController::class, 'downloadTemplate']);
            Route::post('/', [PPEImportController::class, 'import']);
        });
    });

    // ==========================================
    // RECRUITMENT
    // ==========================================

    // Dashboard
    Route::prefix('recruitment')->group(function () {
        Route::get('/dashboard', [CandidateController::class, 'dashboard']);
        Route::get('/pipeline', [CandidateController::class, 'pipeline']);
        Route::get('/metrics', [CandidateController::class, 'metrics']);
        Route::get('/status-options', [CandidateController::class, 'statusOptions']);
        Route::get('/document-types', [CandidateController::class, 'documentTypes']);
    });

    // Candidates
    Route::prefix('candidates')->group(function () {
        Route::get('/', [CandidateController::class, 'index']);
        Route::get('/stats', [CandidateController::class, 'stats']);
        Route::get('/cv', [CandidateController::class, 'getWithCV']);
        Route::post('/', [CandidateController::class, 'store']);
        Route::get('/{id}', [CandidateController::class, 'show']);
        Route::put('/{id}', [CandidateController::class, 'update']);
        Route::delete('/{id}', [CandidateController::class, 'destroy']);
        Route::post('/{id}/cv', [CandidateController::class, 'uploadCV']);
        Route::put('/{id}/status', [CandidateController::class, 'updateStatus']);
        Route::get('/{id}/applications', [CandidateController::class, 'getApplications']);
        Route::get('/{id}/history', [CandidateController::class, 'getHistory']);
    });

    // Vacancies
    Route::prefix('vacancies')->group(function () {
        Route::get('/', [VacancyController::class, 'index']);
        Route::get('/stats', [VacancyController::class, 'stats']);
        Route::post('/', [VacancyController::class, 'store']);
        Route::get('/{id}', [VacancyController::class, 'show']);
        Route::put('/{id}', [VacancyController::class, 'update']);
        Route::delete('/{id}', [VacancyController::class, 'destroy']);
        Route::put('/{id}/status', [VacancyController::class, 'updateStatus']);
        Route::get('/{id}/applications', [VacancyController::class, 'getApplications']);
    });

    // Applications
    Route::prefix('applications')->group(function () {
        Route::get('/', [ApplicationController::class, 'index']);
        Route::get('/stats', [ApplicationController::class, 'stats']);
        Route::post('/', [ApplicationController::class, 'store']);
        Route::get('/{id}', [ApplicationController::class, 'show']);
        Route::put('/{id}', [ApplicationController::class, 'update']);
        Route::delete('/{id}', [ApplicationController::class, 'destroy']);
        Route::put('/{id}/status', [ApplicationController::class, 'updateStatus']);
        Route::get('/{id}/history', [ApplicationController::class, 'getStatusHistory']);
        Route::get('/candidate/{candidateId}', [ApplicationController::class, 'getByCandidate']);
        Route::get('/vacancy/{vacancyId}', [ApplicationController::class, 'getByVacancy']);
        Route::post('/bulk-status', [ApplicationController::class, 'bulkUpdateStatus']);
    });

    // Onboarding
    Route::prefix('onboarding')->group(function () {
        Route::get('/', [OnboardingController::class, 'index']);
        Route::get('/stats', [OnboardingController::class, 'stats']);
        Route::post('/', [OnboardingController::class, 'store']);
        Route::get('/{id}', [OnboardingController::class, 'show']);
        Route::put('/{id}', [OnboardingController::class, 'update']);
        Route::delete('/{id}', [OnboardingController::class, 'destroy']);
        Route::put('/{id}/status', [OnboardingController::class, 'updateStatus']);
        Route::get('/{id}/history', [OnboardingController::class, 'getStatusHistory']);
        Route::put('/{id}/progress', [OnboardingController::class, 'updateProgress']);
        Route::put('/{id}/tasks', [OnboardingController::class, 'updateTasks']);
        Route::put('/{id}/tasks/{taskIndex}/toggle', [OnboardingController::class, 'toggleTask']);
    });

    // ==========================================
    // INCIDENT REPORTS
    // ==========================================
    Route::prefix('incident-reports')->group(function () {
        Route::get('/', [IncidentReportController::class, 'index']);
        Route::get('/stats', [IncidentReportController::class, 'stats']);
        Route::post('/', [IncidentReportController::class, 'store']);
        Route::get('/{id}', [IncidentReportController::class, 'show']);
        Route::put('/{id}', [IncidentReportController::class, 'update']);
        Route::delete('/{id}', [IncidentReportController::class, 'destroy']);
        Route::put('/{id}/status', [IncidentReportController::class, 'updateStatus']);
        Route::get('/{id}/history', [IncidentReportController::class, 'getStatusHistory']);
        Route::post('/{id}/approval-flow', [IncidentReportController::class, 'setApprovalFlow']);
        Route::put('/{id}/approve/{managerLevel}', [IncidentReportController::class, 'managerApprove']);
    });

    // ==========================================
    // LOST TIME INJURY
    // ==========================================
    Route::prefix('lost-time-injuries')->group(function () {
        Route::get('/', [LostTimeInjuryController::class, 'index']);
        Route::get('/stats', [LostTimeInjuryController::class, 'stats']);
        Route::post('/', [LostTimeInjuryController::class, 'store']);
        Route::get('/{id}', [LostTimeInjuryController::class, 'show']);
        Route::put('/{id}', [LostTimeInjuryController::class, 'update']);
        Route::delete('/{id}', [LostTimeInjuryController::class, 'destroy']);
        Route::put('/{id}/status', [LostTimeInjuryController::class, 'updateStatus']);
        Route::get('/{id}/history', [LostTimeInjuryController::class, 'getStatusHistory']);
        Route::post('/{id}/approval-flow', [LostTimeInjuryController::class, 'setApprovalFlow']);
        Route::put('/{id}/approve/{managerLevel}', [LostTimeInjuryController::class, 'managerApprove']);
    });

    // ==========================================
    // PAYROLL
    // ==========================================
    Route::prefix('payroll')->group(function () {
        Route::get('/', [PayrollController::class, 'index']);
        Route::get('/stats', [PayrollController::class, 'stats']);
        Route::post('/', [PayrollController::class, 'store']);
        Route::get('/{id}', [PayrollController::class, 'show']);
        Route::put('/{id}', [PayrollController::class, 'update']);
        Route::put('/{id}/status', [PayrollController::class, 'updateStatus']);
        Route::delete('/{id}', [PayrollController::class, 'destroy']);
    });

    // ==========================================
    // PAYSLIPS
    // ==========================================
    Route::prefix('payslips')->group(function () {
        Route::get('/', [PayslipController::class, 'index']);
        Route::post('/generate/{payrollPeriodId}', [PayslipController::class, 'generate']);
        Route::get('/{id}', [PayslipController::class, 'show']);
        Route::put('/{id}/status', [PayslipController::class, 'updateStatus']);
        Route::delete('/{id}', [PayslipController::class, 'destroy']);
        Route::get('/employee/{employeeId}/summary', [PayslipController::class, 'employeeSummary']);
    });

    // ==========================================
    // TAX SETTINGS
    // ==========================================
    Route::prefix('tax-settings')->group(function () {
        Route::get('/', [TaxSettingController::class, 'index']);
        Route::get('/active', [TaxSettingController::class, 'active']);
        Route::post('/calculate', [TaxSettingController::class, 'calculate']);
        Route::post('/', [TaxSettingController::class, 'store']);
        Route::get('/{id}', [TaxSettingController::class, 'show']);
        Route::put('/{id}', [TaxSettingController::class, 'update']);
        Route::delete('/{id}', [TaxSettingController::class, 'destroy']);
        Route::post('/{id}/activate', [TaxSettingController::class, 'activate']);
    });

    // ==========================================
    // EXCHANGE RATES
    // ==========================================
    Route::prefix('exchange-rates')->group(function () {
        Route::get('/', [ExchangeRateController::class, 'index']);
        Route::get('/active', [ExchangeRateController::class, 'active']);
        Route::post('/convert', [ExchangeRateController::class, 'convert']);
        Route::post('/', [ExchangeRateController::class, 'store']);
        Route::put('/{id}', [ExchangeRateController::class, 'update']);
        Route::delete('/{id}', [ExchangeRateController::class, 'destroy']);
    });

    // ==========================================
    // PAYROLL ADJUSTMENTS
    // ==========================================
    Route::prefix('payroll-adjustments')->group(function () {
        Route::get('/{id}', [PayrollAdjustmentController::class, 'show']);
        Route::post('/{id}/adjust', [PayrollAdjustmentController::class, 'adjust']);
        Route::post('/{id}/clear', [PayrollAdjustmentController::class, 'clear']);
        Route::get('/employee/{employeeId}/history', [PayrollAdjustmentController::class, 'history']);
    });
});

// ==========================================
// FALLBACK ROUTE
// ==========================================
Route::fallback(function () {
    return response()->json([
        'status' => 'error',
        'message' => 'Route not found'
    ], 404);
});
