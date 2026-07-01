<?php
// app/Http/Controllers/Api/EmployeeController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\WorkSchedule;
use App\Services\CacheService;
use App\Services\EmployeeImportExportService;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EmployeeController extends Controller
{
    protected EmployeeImportExportService $importExportService;

    public function __construct(EmployeeImportExportService $importExportService)
    {
        $this->importExportService = $importExportService;
    }

    /**
     * Get list of employees with filters
     */
    public function index(Request $request): JsonResponse
    {
        $cacheKey = 'employees_list_' . md5(json_encode($request->all()));

        $data = CacheService::remember($cacheKey, function () use ($request) {
            $query = Employee::query()
                ->with([
                    'department:id,name,code',
                    'position:id,title',
                    'activeSchedule' => function ($q) {
                        $q->select('id', 'employee_id', 'work_schedule_id', 'start_date', 'is_active')
                            ->with(['workSchedule:id,name,code']);
                    },
                ])
                ->select([
                    'id',
                    'employee_id',
                    'first_name',
                    'last_name',
                    'email',
                    'phone',
                    'department_id',
                    'position_id',
                    'status',
                    'employment_type',
                    'hire_date',
                    'profile_photo',
                ]);

            // Search filter
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Department filter
            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            // Status filter
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Employment type filter
            if ($request->filled('employment_type')) {
                $query->where('employment_type', $request->employment_type);
            }

            // Date filters
            if ($request->filled('start_date')) {
                $query->whereDate('hire_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->whereDate('hire_date', '<=', $request->end_date);
            }

            $perPage = min((int) $request->input('per_page', 15), 50);

            return $query->orderBy('first_name')->paginate($perPage);
        }, 1);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Get single employee details
     */
    public function show($id): JsonResponse
    {
        try {
            $employee = Employee::with([
                'department:id,name,code',
                'position:id,title',
                'manager:id,first_name,last_name',
                'leaveBalances' => function ($q) {
                    $q->where('year', date('Y'))
                        ->with(['leaveType:id,name,code']);
                },
                'activeSchedule' => function ($q) {
                    $q->with(['workSchedule:id,name,code']);
                },
            ])->find($id);

            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found',
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'data' => $employee,
            ]);
        } catch (\Exception $e) {
            Log::error('Employee show error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch employee: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create new employee
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:employees,email',
            'password' => 'required|string|min:8',
            'hire_date' => 'required|date',
            'probation_end_date' => 'nullable|date|after:hire_date',
            'department_id' => 'required|exists:departments,id',
            'position_id' => 'required|exists:positions,id',
            'employment_type' => 'required|in:full_time,part_time,contract,intern',
            'salary' => 'nullable|numeric|min:0',
            'phone' => 'nullable|string|max:20',
            'gender' => 'nullable|in:male,female,other',
            'date_of_birth' => 'nullable|date',
            'national_id' => 'nullable|string|max:50|unique:employees,national_id',
            'address' => 'nullable|string',
            'manager_id' => 'nullable|exists:employees,id',
            'emergency_contact_name' => 'nullable|string|max:100',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relation' => 'nullable|string|max:50',
            'card_number' => 'nullable|string|unique:employees,card_number',
            'card_type' => 'nullable|in:RFID,NFC,Barcode,QR',
            'use_card' => 'nullable|boolean',
            'generate_card' => 'nullable|boolean',
            'employment_status' => 'nullable|in:probation,permanent,contract',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Generate Employee ID
            $employeeId = $this->importExportService->generateEmployeeId($request->department_id);

            // Calculate probation end date
            $probationEndDate = $request->probation_end_date;
            if (!$probationEndDate && $request->hire_date) {
                $probationEndDate = Carbon::parse($request->hire_date)->addMonths(3)->format('Y-m-d');
            }

            // Create employee
            $employee = Employee::create([
                'employee_id' => $employeeId,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'phone' => $request->phone,
                'date_of_birth' => $request->date_of_birth,
                'gender' => $request->gender,
                'national_id' => $request->national_id,
                'address' => $request->address,
                'hire_date' => $request->hire_date,
                'probation_end_date' => $probationEndDate,
                'department_id' => $request->department_id,
                'position_id' => $request->position_id,
                'employment_type' => $request->employment_type,
                'status' => $request->status ?? 'active',
                'employment_status' => $request->employment_status ?? 'probation',
                'salary' => $request->salary,
                'manager_id' => $request->manager_id,
                'emergency_contact_name' => $request->emergency_contact_name,
                'emergency_contact_phone' => $request->emergency_contact_phone,
                'emergency_contact_relation' => $request->emergency_contact_relation,
                'card_number' => $request->card_number,
                'card_type' => $request->card_type ?? 'RFID',
                'use_card' => $request->use_card ?? false,
            ]);

            // Create leave balances
            $leaveBalances = $this->createLeaveBalances($employee);

            // Assign default schedule
            $this->assignDefaultSchedule($employee);

            // Generate card if needed
            $cardNumber = null;
            if (($request->generate_card || !$request->card_number) && $request->use_card) {
                $cardNumber = $this->importExportService->generateCardNumber($employee);
                $employee->update(['card_number' => $cardNumber]);
            }

            DB::commit();

            // Load relationships
            $employee->load([
                'department:id,name,code',
                'position:id,title',
                'activeSchedule.workSchedule:id,name,code',
                'leaveBalances.leaveType:id,name,code',
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Employee created successfully',
                'data' => [
                    'employee' => $employee,
                    'auto_generated' => [
                        'employee_id' => $employeeId,
                        'schedule_assigned' => $employee->activeSchedule?->workSchedule?->name ?? 'Default',
                        'leave_balances' => $leaveBalances,
                        'card_number' => $cardNumber ?? $employee->card_number ?? 'Not assigned',
                        'probation_end_date' => $probationEndDate,
                    ],
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating employee: ' . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create employee: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update employee
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $employee = Employee::find($id);
        if (!$employee) {
            return response()->json(['status' => 'error', 'message' => 'Employee not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => "required|email|unique:employees,email,{$id}",
            'hire_date' => 'required|date',
            'department_id' => 'required|exists:departments,id',
            'position_id' => 'required|exists:positions,id',
            'employment_type' => 'required|in:full_time,part_time,contract,intern',
            'salary' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:active,inactive,suspended,terminated,resigned',
            'employment_status' => 'nullable|in:probation,permanent,contract',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $employee->update($request->only([
            'first_name',
            'last_name',
            'email',
            'phone',
            'date_of_birth',
            'gender',
            'national_id',
            'address',
            'hire_date',
            'probation_end_date',
            'department_id',
            'position_id',
            'employment_type',
            'status',
            'employment_status',
            'salary',
            'manager_id',
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_relation',
            'card_number',
            'card_type',
            'use_card',
        ]));

        CacheService::clearEmployee($id);

        return response()->json([
            'status' => 'success',
            'message' => 'Employee updated successfully',
            'data' => $employee->fresh()->load(['department:id,name,code', 'position:id,title']),
        ]);
    }

    /**
     * Delete employee (soft delete)
     */
    public function destroy(int $id): JsonResponse
    {
        $employee = Employee::find($id);
        if (!$employee) {
            return response()->json(['status' => 'error', 'message' => 'Employee not found'], 404);
        }

        $employee->update(['status' => 'terminated']);
        $employee->delete();

        CacheService::clearEmployee($id);

        return response()->json([
            'status' => 'success',
            'message' => 'Employee terminated successfully',
        ]);
    }

    /**
     * Restore deleted employee
     */
    public function restore(int $id): JsonResponse
    {
        $employee = Employee::withTrashed()->find($id);
        if (!$employee) {
            return response()->json(['status' => 'error', 'message' => 'Employee not found'], 404);
        }

        $employee->restore();
        $employee->update(['status' => 'active']);

        CacheService::clearEmployee($id);

        return response()->json([
            'status' => 'success',
            'message' => 'Employee restored successfully',
            'data' => $employee,
        ]);
    }

    /**
     * Get employee statistics
     */
    public function stats(): JsonResponse
    {
        try {
            $stats = [
                'total' => Employee::count(),
                'active' => Employee::where('status', 'active')->count(),
                'inactive' => Employee::where('status', 'inactive')->count(),
                'suspended' => Employee::where('status', 'suspended')->count(),
                'terminated' => Employee::where('status', 'terminated')->count(),
                'resigned' => Employee::where('status', 'resigned')->count(),
                'full_time' => Employee::where('employment_type', 'full_time')->count(),
                'part_time' => Employee::where('employment_type', 'part_time')->count(),
                'contract' => Employee::where('employment_type', 'contract')->count(),
                'intern' => Employee::where('employment_type', 'intern')->count(),
                'probation' => Employee::where('employment_status', 'probation')->count(),
                'permanent' => Employee::where('employment_status', 'permanent')->count(),
            ];

            return response()->json([
                'status' => 'success',
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            Log::error('Employee stats error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch stats: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download import template
     */
    public function downloadTemplate()
    {
        try {
            Log::info('📥 Downloading employee template...');

            $spreadsheet = $this->importExportService->createTemplate();
            $fileName = $this->importExportService->getTemplateFileName();
            $filePath = $this->importExportService->saveSpreadsheet($spreadsheet, $fileName);

            return response()->download($filePath, $fileName, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Expose-Headers' => 'Content-Disposition',
            ])->deleteFileAfterSend(true);
        } catch (Exception $e) {
            Log::error('❌ Download template error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to download template: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import employees from Excel
     */
    public function import(Request $request): JsonResponse
    {
        try {
            Log::info('📤 Import request received');

            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls,csv|max:10240'
            ]);

            $result = $this->importExportService->processImport($request->file('file'));

            if ($result['success_count'] > 0) {
                // Clear employees list cache
                CacheService::clearEmployeesList(); // Clear list cache
                CacheService::clearEmployeeCache(); // Clear all employee cache
                CacheService::clearPattern('employees_list_*'); // Clear pattern

                Log::info('✅ Cache cleared after import');
            }

            Log::info('📊 Import result:', $result);



            if ($result['success'] || $result['success_count'] > 0) {
                $message = "✅ Import completed!\n";
                $message .= "✅ Success: {$result['success_count']}\n";
                $message .= "❌ Failed: {$result['fail_count']}";

                if (!empty($result['errors'])) {
                    $message .= "\n\nErrors:\n" . implode("\n", array_slice($result['errors'], 0, 10));
                    if (count($result['errors']) > 10) {
                        $message .= "\n... and " . (count($result['errors']) - 10) . " more errors";
                    }
                }

                return response()->json([
                    'status' => 'success',
                    'message' => $message,
                    'data' => $result,
                    'refresh' => true,
                ]);
            } else {
                $errorMessage = "❌ Import failed!\n";
                $errorMessage .= "Success: 0\n";
                $errorMessage .= "Failed: {$result['fail_count']}";

                if (!empty($result['errors'])) {
                    $errorMessage .= "\n\nErrors:\n" . implode("\n", $result['errors']);
                } else if (!empty($result['message'])) {
                    $errorMessage .= "\n\nMessage: " . $result['message'];
                }

                return response()->json([
                    'status' => 'error',
                    'message' => $errorMessage,
                    'data' => $result,
                ], 422);
            }
        } catch (Exception $e) {
            Log::error('Import employees error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Import failed: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Export employees to Excel
     */
    public function export(Request $request)
    {
        try {
            Log::info('📤 Starting employee export...');

            $query = Employee::with(['department', 'position']);

            if ($request->filled('start_date')) {
                $query->whereDate('hire_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->whereDate('hire_date', '<=', $request->end_date);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('employment_type')) {
                $query->where('employment_type', $request->employment_type);
            }
            if ($request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            $employees = $query->orderBy('first_name')->get();

            if ($employees->isEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No employees found with the given filters'
                ], 404);
            }

            $filters = $request->only(['start_date', 'end_date', 'status', 'employment_type', 'department_id']);
            $spreadsheet = $this->importExportService->createExport($employees, $filters);
            $fileName = $this->importExportService->getExportFileName();
            $filePath = $this->importExportService->saveSpreadsheet($spreadsheet, $fileName);

            Log::info('✅ Export completed: ' . $fileName);

            return response()->download($filePath, $fileName, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Expose-Headers' => 'Content-Disposition',
            ])->deleteFileAfterSend(true);
        } catch (Exception $e) {
            Log::error('❌ Export error: ' . $e->getMessage());
            Log::error('❌ Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'status' => 'error',
                'message' => 'Export failed: ' . $e->getMessage()
            ], 500);
        }
    }

    // ==========================================
    // PRIVATE HELPER METHODS
    // ==========================================

    /**
     * Create leave balances for employee
     */
    private function createLeaveBalances(Employee $employee): array
    {
        $currentYear = date('Y');
        $leaveTypes = LeaveType::where('is_active', true)->get();
        $hireDate = Carbon::parse($employee->hire_date);
        $probationEndDate = $employee->probation_end_date
            ? Carbon::parse($employee->probation_end_date)
            : $hireDate->copy()->addMonths(3);

        $today = Carbon::now();
        $isOnProbation = $today->lt($probationEndDate);
        $createdBalances = [];

        foreach ($leaveTypes as $leaveType) {
            $totalDays = $this->calculateLeaveDays($leaveType, $hireDate, $currentYear, $isOnProbation);

            $balance = LeaveBalance::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                    'year' => $currentYear,
                ],
                [
                    'total_days' => $totalDays,
                    'earned_days' => $totalDays,
                    'used_days' => 0,
                    'pending_days' => 0,
                    'remaining_days' => $totalDays,
                    'carry_forward_days' => 0,
                    'seniority_bonus_days' => 0,
                    'replacement_days' => 0,
                    'expiry_date' => Carbon::create($currentYear + 1, 3, 31)->format('Y-m-d'),
                ]
            );

            $createdBalances[] = [
                'type' => $leaveType->name,
                'code' => $leaveType->code,
                'total_days' => $totalDays,
                'remaining_days' => $totalDays,
            ];
        }

        return $createdBalances;
    }

    /**
     * Calculate leave days based on type
     */
    private function calculateLeaveDays($leaveType, $hireDate, int $currentYear, bool $isOnProbation): float
    {
        $totalDays = 0;

        switch ($leaveType->code) {
            case 'AL': // Annual Leave
                if (!$isOnProbation) {
                    if ($hireDate->year == $currentYear) {
                        $monthsWorked = max(0, 12 - $hireDate->month + 1);
                        $totalDays = round(1.5 * $monthsWorked, 1);
                    } else {
                        $totalDays = $leaveType->days_per_year;
                    }
                }
                break;
            case 'SL': // Sick Leave
                if ($hireDate->year == $currentYear) {
                    $monthsWorked = max(0, 12 - $hireDate->month + 1);
                    $totalDays = round(($leaveType->days_per_year / 12) * $monthsWorked);
                } else {
                    $totalDays = $leaveType->days_per_year;
                }
                break;
            case 'SPL': // Special Leave
                if (!$isOnProbation) {
                    if ($hireDate->year == $currentYear) {
                        $monthsWorked = max(0, 12 - $hireDate->month + 1);
                        $totalDays = round(($leaveType->days_per_year / 12) * $monthsWorked);
                    } else {
                        $totalDays = $leaveType->days_per_year;
                    }
                }
                break;
            default:
                $totalDays = $leaveType->days_per_year;
                break;
        }

        return $totalDays;
    }

    /**
     * Assign default schedule to employee
     */
    private function assignDefaultSchedule(Employee $employee): void
    {
        $defaultSchedule = WorkSchedule::where('is_active', true)
            ->orderBy('is_default', 'desc')
            ->first();

        if ($defaultSchedule) {
            EmployeeSchedule::where('employee_id', $employee->id)
                ->update(['is_active' => false]);

            EmployeeSchedule::create([
                'employee_id' => $employee->id,
                'work_schedule_id' => $defaultSchedule->id,
                'start_date' => $employee->hire_date ?? now()->format('Y-m-d'),
                'end_date' => null,
                'is_active' => true,
                'notes' => 'Auto-assigned on employee creation',
            ]);
        }
    }
}
