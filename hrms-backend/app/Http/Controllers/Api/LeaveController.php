<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\ReplacementLeave;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class LeaveController extends Controller
{
    /**
     * Get leave balance for employee
     */
    public function balance(Request $request): JsonResponse
    {
        try {
            $employeeId = $request->employee_id ?? $request->user()->id;
            $employee = Employee::find($employeeId);

            if (!$employee) {
                return response()->json(['status' => 'error', 'message' => 'Employee not found'], 404);
            }

            // Generate balance if not exists
            $this->ensureBalanceExists($employee);

            $balances = LeaveBalance::where('employee_id', $employeeId)
                ->where('year', date('Y'))
                ->with('leaveType')
                ->get();

            $yearsOfService = Carbon::parse($employee->hire_date)->diffInYears(Carbon::now());

            $result = $balances->map(function ($balance) use ($yearsOfService) {
                return [
                    'id' => $balance->id,
                    'leave_type_id' => $balance->leave_type_id,
                    'leave_type' => $balance->leaveType->name,
                    'leave_code' => $balance->leaveType->code,
                    'base_entitlement' => $balance->base_entitlement,
                    'seniority_bonus' => $balance->seniority_bonus,
                    'carry_forward' => $balance->carry_forward,
                    'replacement_days' => $balance->replacement_days,
                    'total_entitlement' => $balance->total_entitlement,
                    'used_days' => $balance->used_days,
                    'pending_days' => $balance->pending_days,
                    'remaining_days' => $balance->remaining_days,
                    'years_of_service' => $yearsOfService,
                ];
            });

            return response()->json([
                'status' => 'success',
                'data' => [
                    'balances' => $result,
                    'employee' => [
                        'id' => $employee->id,
                        'name' => $employee->first_name . ' ' . $employee->last_name,
                        'hire_date' => $employee->hire_date,
                        'years_of_service' => $yearsOfService,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to load balance: ' . $e->getMessage(),
            ], 500);
        }
    }

    // app/Http/Controllers/Api/LeaveController.php
    // Perbaiki method index untuk menampilkan leaves dari bawahan manager

    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = Leave::with([
                'employee:id,first_name,last_name,employee_id,department_id,manager_id',
                'employee.department:id,name',
                'leaveType:id,name,code',
                'approvedBy:id,first_name,last_name'
            ]);

            // If not admin/HR, only show leaves from employees under this manager
            if (!$this->isAdminOrHR($user)) {
                // Get all employee IDs that are under this manager
                $subordinateIds = Employee::where('manager_id', $user->id)->pluck('id')->toArray();

                // Also include the manager's own leaves
                $subordinateIds[] = $user->id;

                $query->whereIn('employee_id', $subordinateIds);
            } else {
                // Admin/HR can filter by employee
                if ($request->filled('employee_id')) {
                    $query->where('employee_id', $request->employee_id);
                }
            }

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Filter by date range
            if ($request->filled('start_date')) {
                $query->whereDate('start_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->whereDate('end_date', '<=', $request->end_date);
            }

            $perPage = $request->input('per_page', 15);
            $leaves = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $leaves,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching leaves: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch leaves: ' . $e->getMessage(),
            ], 500);
        }
    }

    // Perbaiki method pendingRequests untuk manager
    public function pendingRequests(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = Leave::with([
                'employee:id,first_name,last_name,employee_id,department_id,manager_id',
                'employee.department:id,name',
                'leaveType:id,name,code'
            ])->where('status', 'pending');

            // If not admin/HR, only show leaves from employees under this manager
            if (!$this->isAdminOrHR($user)) {
                $subordinateIds = Employee::where('manager_id', $user->id)->pluck('id')->toArray();

                if (empty($subordinateIds)) {
                    // Manager has no subordinates, return empty
                    return response()->json([
                        'status' => 'success',
                        'data' => [
                            'data' => [],
                            'current_page' => 1,
                            'per_page' => 15,
                            'total' => 0,
                            'last_page' => 1,
                        ],
                    ]);
                }

                $query->whereIn('employee_id', $subordinateIds);
            } else {
                // Admin/HR can see all pending leaves
                if ($request->filled('employee_id')) {
                    $query->where('employee_id', $request->employee_id);
                }
            }

            $perPage = $request->input('per_page', 15);
            $leaves = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $leaves,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching pending requests: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch pending requests: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get leave types
     * GET /api/leave-types
     */
    public function leaveTypes(Request $request): JsonResponse
    {
        try {
            $types = LeaveType::where('is_active', true)
                ->select('id', 'code', 'name', 'description', 'days_per_year', 'is_paid', 'allow_carry_forward', 'max_carry_forward_days')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $types,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch leave types',
            ], 500);
        }
    }

    /**
     * Get all employees leave balances (Admin only)
     * GET /api/leaves/all-balances
     */
    // app/Http/Controllers/Api/LeaveController.php
    // Perbaiki method allBalances

    public function allBalances(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Check if user is Admin/HR/Manager
            $isAdminOrHR = $this->isAdminOrHR($user);
            $isManager = !$isAdminOrHR && $user->position && str_contains($user->position->title ?? '', 'Manager');

            $query = Employee::with([
                'department:id,name',
                'leaveBalances' => function ($query) {
                    $query->where('year', date('Y'))
                        ->with('leaveType:id,name,code');
                }
            ])->where('status', 'active');

            // Filter by access level
            if ($isManager) {
                // Manager only sees their subordinates
                $subordinateIds = Employee::where('manager_id', $user->id)->pluck('id')->toArray();
                $query->whereIn('id', $subordinateIds);
            } elseif (!$isAdminOrHR) {
                // Regular employee only sees themselves
                $query->where('id', $user->id);
            }

            // Filter by department (only for Admin/HR)
            if ($isAdminOrHR && $request->filled('department_id')) {
                $query->where('department_id', $request->department_id);
            }

            // Search by name
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            }

            $perPage = $request->input('per_page', 20);
            $employees = $query->paginate($perPage);

            // Add years of service
            foreach ($employees as $employee) {
                $employee->years_of_service = Carbon::parse($employee->hire_date)->diffInYears(Carbon::now());
            }

            return response()->json([
                'status' => 'success',
                'data' => $employees,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching all balances: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch balances: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get replacement leaves
     * GET /api/replacement-leaves
     */
    // app/Http/Controllers/Api/LeaveController.php
    // Perbaiki method replacementList

    public function replacementList(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = ReplacementLeave::with([
                'employee:id,first_name,last_name,employee_id,manager_id',
                'approvedBy:id,first_name,last_name'
            ]);

            // If not admin/HR, only show replacement leaves from employees under this manager
            if (!$this->isAdminOrHR($user)) {
                $subordinateIds = Employee::where('manager_id', $user->id)->pluck('id')->toArray();

                // Also include the manager's own replacement leaves
                $subordinateIds[] = $user->id;

                if (empty($subordinateIds)) {
                    return response()->json([
                        'status' => 'success',
                        'data' => [
                            'data' => [],
                            'current_page' => 1,
                            'per_page' => 15,
                            'total' => 0,
                            'last_page' => 1,
                        ],
                    ]);
                }

                $query->whereIn('employee_id', $subordinateIds);
            } else {
                // Admin/HR can see all
                if ($request->filled('employee_id')) {
                    $query->where('employee_id', $request->employee_id);
                }
            }

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $perPage = $request->input('per_page', 15);
            $replacements = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $replacements,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching replacement leaves: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch replacement leaves: ' . $e->getMessage(),
            ], 500);
        }
    }

    // app/Http/Controllers/Api/LeaveController.php
    // Perbaiki method requestReplacement

    public function requestReplacement(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'work_date' => 'required|date',
            'work_day_type' => 'required|in:weekend,public_holiday',
            'hours_worked' => 'required|integer|min:1|max:12',
            'replacement_date' => 'required|date|after:today',
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $employee = $request->user();
        $workDate = Carbon::parse($request->work_date);
        $replacementDate = Carbon::parse($request->replacement_date);

        // Calculate days to add
        $daysToAdd = $request->hours_worked >= 8 ? 1 : 0.5;

        // Check if replacement date is not a weekend
        if ($replacementDate->isWeekend()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Replacement date cannot be on weekend. Please choose a weekday.',
            ], 422);
        }

        // Check if already exists
        $existing = ReplacementLeave::where('employee_id', $employee->id)
            ->where('work_date', $workDate->format('Y-m-d'))
            ->where('status', '!=', 'rejected')
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 'error',
                'message' => 'You already have a replacement request for this date (Status: ' . $existing->status . ')',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $replacement = ReplacementLeave::create([
                'employee_id' => $employee->id,
                'work_date' => $workDate->format('Y-m-d'),
                'work_day_type' => $request->work_day_type,
                'hours_worked' => $request->hours_worked,
                'replacement_date' => $replacementDate->format('Y-m-d'),
                'reason' => $request->reason,
                'days_to_add' => $daysToAdd,
                'status' => 'pending',
            ]);

            // Send notification to manager
            $manager = $this->getUserManager($employee);
            if ($manager) {
                $this->createNotification(
                    $manager->id,
                    $employee->id,
                    'replacement_request',
                    'New Replacement Leave Request',
                    "{$employee->first_name} {$employee->last_name} requests replacement leave for working on {$workDate->format('Y-m-d')}",
                    [
                        'replacement_id' => $replacement->id,
                        'employee_id' => $employee->id,
                        'work_date' => $workDate->format('Y-m-d'),
                        'hours_worked' => $request->hours_worked,
                        'days_to_add' => $daysToAdd,
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Replacement leave request submitted successfully!',
                'data' => $replacement->load('employee'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Replacement request error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to submit request: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel replacement leave request (only by employee who requested)
     * PUT /api/replacement-leaves/{id}/cancel
     */
    public function cancelReplacement(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::with(['employee'])->findOrFail($id);
            $user = $request->user();

            // Check if user is the one who requested
            if ($replacement->employee_id !== $user->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You can only cancel your own replacement requests',
                ], 403);
            }

            // Check if replacement is still pending
            if ($replacement->status !== 'pending') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Only pending replacement requests can be cancelled',
                ], 422);
            }

            DB::beginTransaction();
            try {
                $replacement->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                    'cancelled_by' => $user->id,
                    'cancellation_reason' => $request->reason ?? 'Cancelled by employee',
                ]);

                // Send notification to manager
                $manager = $this->getUserManager($user);
                if ($manager) {
                    $this->createNotification(
                        $manager->id,
                        $user->id,
                        'replacement_cancelled',
                        'Replacement Request Cancelled',
                        "{$user->first_name} {$user->last_name} has cancelled their replacement leave request for {$replacement->work_date}",
                        [
                            'replacement_id' => $replacement->id,
                            'employee_id' => $user->id,
                            'work_date' => $replacement->work_date,
                        ]
                    );
                }

                DB::commit();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Replacement request cancelled successfully',
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            \Log::error('Cancel replacement error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to cancel: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if user can approve replacement (not themselves)
     */
    private function canApproveReplacement($user, $replacement): bool
    {
        // Admin/HR can approve anyone except themselves
        if ($this->isAdminOrHR($user)) {
            return $user->id !== $replacement->employee_id;
        }

        // Manager can approve their subordinates
        if ($user->id === $replacement->employee->manager_id) {
            return true;
        }

        return false;
    }

    /**
     * Approve replacement leave (only manager/HR, not self)
     * PUT /api/replacement-leaves/{id}/approve
     */
    public function approveReplacement(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::with(['employee'])->findOrFail($id);
            $user = $request->user();

            // Check if user can approve
            if (!$this->canApproveReplacement($user, $replacement)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You are not authorized to approve this replacement request',
                ], 403);
            }

            // Check if trying to approve own replacement
            if ($user->id === $replacement->employee_id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You cannot approve your own replacement request. Please ask your manager or HR.',
                ], 403);
            }

            if ($replacement->status !== 'pending') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This request is not pending',
                ], 422);
            }

            DB::beginTransaction();

            $replacement->update([
                'status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);

            // Add replacement days to Annual Leave balance
            $annualLeaveType = LeaveType::where('code', 'AL')->first();
            if ($annualLeaveType) {
                $balance = LeaveBalance::firstOrCreate(
                    [
                        'employee_id' => $replacement->employee_id,
                        'leave_type_id' => $annualLeaveType->id,
                        'year' => date('Y'),
                    ],
                    [
                        'base_entitlement' => $annualLeaveType->days_per_year,
                        'total_entitlement' => $annualLeaveType->days_per_year,
                        'remaining_days' => $annualLeaveType->days_per_year,
                    ]
                );

                $balance->update([
                    'replacement_days' => ($balance->replacement_days ?? 0) + $replacement->days_to_add,
                    'total_entitlement' => $balance->total_entitlement + $replacement->days_to_add,
                    'remaining_days' => $balance->remaining_days + $replacement->days_to_add,
                ]);
            }

            // Send notification to employee
            $this->createNotification(
                $replacement->employee_id,
                $user->id,
                'replacement_approved',
                'Replacement Leave Approved',
                "Your replacement leave request for working on {$replacement->work_date} has been approved. +{$replacement->days_to_add} day(s) added to your Annual Leave.",
                [
                    'replacement_id' => $replacement->id,
                    'work_date' => $replacement->work_date,
                    'days_added' => $replacement->days_to_add,
                    'approved_by' => $user->first_name . ' ' . $user->last_name,
                ]
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Replacement leave approved! +{$replacement->days_to_add} day(s) added to Annual Leave.",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Approve replacement error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to approve: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reject replacement leave (only manager/HR)
     * PUT /api/replacement-leaves/{id}/reject
     */
    public function rejectReplacement(Request $request, $id): JsonResponse
    {
        try {
            $replacement = ReplacementLeave::with(['employee'])->findOrFail($id);
            $user = $request->user();

            // Check if user can approve (reject uses same permission)
            if (!$this->canApproveReplacement($user, $replacement)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You are not authorized to reject this replacement request',
                ], 403);
            }

            if ($replacement->status !== 'pending') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This request is not pending',
                ], 422);
            }

            $replacement->update([
                'status' => 'rejected',
                'rejection_reason' => $request->reason ?? 'Rejected by manager',
            ]);

            // Send notification to employee
            $this->createNotification(
                $replacement->employee_id,
                $user->id,
                'replacement_rejected',
                'Replacement Leave Rejected',
                "Your replacement leave request for working on {$replacement->work_date} has been rejected.\nReason: " . ($request->reason ?? 'Not specified'),
                [
                    'replacement_id' => $replacement->id,
                    'work_date' => $replacement->work_date,
                    'reason' => $request->reason,
                ]
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Replacement leave rejected',
            ]);
        } catch (\Exception $e) {
            \Log::error('Reject replacement error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to reject: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate balance for employee
     * POST /api/leaves/generate-balance
     */
    public function generateBalance(Request $request): JsonResponse
    {
        try {
            $employeeId = $request->employee_id ?? $request->user()->id;
            $employee = Employee::find($employeeId);

            if (!$employee) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Employee not found',
                ], 404);
            }

            $this->ensureBalanceExists($employee);

            return response()->json([
                'status' => 'success',
                'message' => 'Leave balance generated successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Error generating balance: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to generate balance: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create leave request with notification
     * POST /api/leaves
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|min:5',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $employee = $request->user();
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        $totalDays = $this->calculateWorkingDays($startDate, $endDate);

        // Check balance
        $balance = LeaveBalance::where([
            'employee_id' => $employee->id,
            'leave_type_id' => $request->leave_type_id,
            'year' => date('Y'),
        ])->first();

        if (!$balance || $balance->remaining_days < $totalDays) {
            return response()->json([
                'status' => 'error',
                'message' => "Insufficient balance! Need {$totalDays} days, available: " . ($balance->remaining_days ?? 0),
            ], 422);
        }

        DB::beginTransaction();
        try {
            $leave = Leave::create([
                'employee_id' => $employee->id,
                'leave_type_id' => $request->leave_type_id,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'total_days' => $totalDays,
                'reason' => $request->reason,
                'status' => 'pending',
            ]);

            $balance->update([
                'pending_days' => $balance->pending_days + $totalDays,
                'remaining_days' => $balance->remaining_days - $totalDays,
            ]);

            // Send notification to manager/HR
            $manager = $this->getUserManager($employee);
            $leaveType = LeaveType::find($request->leave_type_id);

            if ($manager) {
                $this->createNotification(
                    $manager->id,
                    $employee->id,
                    'leave_request',
                    'New Leave Request',
                    "{$employee->first_name} {$employee->last_name} requests {$leaveType->name} from {$startDate->format('d M Y')} to {$endDate->format('d M Y')} ({$totalDays} days)",
                    [
                        'leave_id' => $leave->id,
                        'employee_id' => $employee->id,
                        'employee_name' => $employee->first_name . ' ' . $employee->last_name,
                        'leave_type' => $leaveType->name,
                        'start_date' => $leave->start_date,
                        'end_date' => $leave->end_date,
                        'total_days' => $totalDays,
                        'reason' => $request->reason,
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Leave request submitted successfully!',
                'data' => $leave->load('leaveType'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Store leave error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to submit leave: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel leave request (only by employee who requested)
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        $leave = Leave::with(['leaveType'])->findOrFail($id);
        $user = $request->user();

        // Check if user is the one who requested
        if ($leave->employee_id !== $user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'You can only cancel your own leave requests',
            ], 403);
        }

        // Check if leave is still pending
        if ($leave->status !== 'pending') {
            return response()->json([
                'status' => 'error',
                'message' => 'Only pending leave requests can be cancelled',
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Update leave status to cancelled
            $leave->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancelled_by' => $user->id,
            ]);

            // Return days to balance
            $balance = LeaveBalance::where([
                'employee_id' => $leave->employee_id,
                'leave_type_id' => $leave->leave_type_id,
                'year' => date('Y', strtotime($leave->start_date)),
            ])->first();

            if ($balance) {
                $balance->update([
                    'pending_days' => $balance->pending_days - $leave->total_days,
                    'remaining_days' => $balance->remaining_days + $leave->total_days,
                ]);
            }

            // Send notification to manager
            $manager = $this->getUserManager($user);
            if ($manager) {
                $this->createNotification(
                    $manager->id,
                    $user->id,
                    'leave_cancelled',
                    'Leave Request Cancelled',
                    "{$user->first_name} {$user->last_name} has cancelled their {$leave->leaveType->name} request",
                    [
                        'leave_id' => $leave->id,
                        'employee_id' => $user->id,
                        'employee_name' => $user->first_name . ' ' . $user->last_name,
                        'leave_type' => $leave->leaveType->name,
                        'start_date' => $leave->start_date,
                        'end_date' => $leave->end_date,
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Leave request cancelled successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to cancel: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if user can approve leave (not themselves)
     */
    private function canApproveLeave($user, $leave): bool
    {
        // Admin/HR can approve anyone except themselves
        if ($this->isAdminOrHR($user)) {
            return $user->id !== $leave->employee_id;
        }

        // Manager can approve their subordinates
        if ($user->id === $leave->employee->manager_id) {
            return true;
        }

        return false;
    }

    /**
     * Approve leave (only manager/HR, not self)
     */
    public function approve(Request $request, $id): JsonResponse
    {
        $leave = Leave::with(['employee', 'leaveType'])->findOrFail($id);
        $user = $request->user();

        // Check if user can approve
        if (!$this->canApproveLeave($user, $leave)) {
            return response()->json([
                'status' => 'error',
                'message' => 'You are not authorized to approve this leave request',
            ], 403);
        }

        // Check if trying to approve own leave
        if ($user->id === $leave->employee_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'You cannot approve your own leave request. Please ask your manager or HR.',
            ], 403);
        }

        if ($leave->status !== 'pending') {
            return response()->json([
                'status' => 'error',
                'message' => 'Leave is not pending',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $leave->update([
                'status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);

            // Update balance: move from pending to used
            $balance = LeaveBalance::where([
                'employee_id' => $leave->employee_id,
                'leave_type_id' => $leave->leave_type_id,
                'year' => date('Y', strtotime($leave->start_date)),
            ])->first();

            if ($balance) {
                $balance->update([
                    'pending_days' => $balance->pending_days - $leave->total_days,
                    'used_days' => $balance->used_days + $leave->total_days,
                ]);
            }

            // Send notification to employee
            $this->createNotification(
                $leave->employee_id,
                $user->id,
                'leave_approved',
                'Leave Request Approved',
                "Your {$leave->leaveType->name} request from {$leave->start_date} to {$leave->end_date} has been approved.",
                [
                    'leave_id' => $leave->id,
                    'leave_type' => $leave->leaveType->name,
                    'start_date' => $leave->start_date,
                    'end_date' => $leave->end_date,
                    'total_days' => $leave->total_days,
                    'approved_by' => $user->first_name . ' ' . $user->last_name,
                ]
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Leave approved successfully',
                'data' => $leave,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to approve: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reject leave with notification
     * PUT /api/leaves/{id}/reject
     */
    public function reject(Request $request, $id): JsonResponse
    {
        $leave = Leave::with(['employee', 'leaveType'])->findOrFail($id);

        if ($leave->status !== 'pending') {
            return response()->json(['status' => 'error', 'message' => 'Leave is not pending'], 422);
        }

        DB::beginTransaction();
        try {
            $rejectionReason = $request->reason ?? 'No reason provided';

            $leave->update([
                'status' => 'rejected',
                'rejection_reason' => $rejectionReason,
            ]);

            // Return days to balance
            $balance = LeaveBalance::where([
                'employee_id' => $leave->employee_id,
                'leave_type_id' => $leave->leave_type_id,
                'year' => date('Y', strtotime($leave->start_date)),
            ])->first();

            if ($balance) {
                $balance->update([
                    'pending_days' => $balance->pending_days - $leave->total_days,
                    'remaining_days' => $balance->remaining_days + $leave->total_days,
                ]);
            }

            // Send notification to employee
            $this->createNotification(
                $leave->employee_id,
                $request->user()->id,
                'leave_rejected',
                'Leave Request Rejected',
                "Your {$leave->leaveType->name} request from {$leave->start_date} to {$leave->end_date} has been rejected. Reason: {$rejectionReason}",
                [
                    'leave_id' => $leave->id,
                    'leave_type' => $leave->leaveType->name,
                    'start_date' => $leave->start_date,
                    'end_date' => $leave->end_date,
                    'total_days' => $leave->total_days,
                    'reason' => $rejectionReason,
                ]
            );

            DB::commit();

            return response()->json(['status' => 'success', 'message' => 'Leave rejected']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to reject: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Process year-end carry forward
     * POST /api/leaves/process-carry-forward
     */
    public function processCarryForward(Request $request): JsonResponse
    {
        try {
            $year = $request->year ?? date('Y') - 1;
            $nextYear = $year + 1;

            $annualLeaveType = LeaveType::where('code', 'AL')->first();
            if (!$annualLeaveType) {
                return response()->json(['status' => 'error', 'message' => 'Annual leave type not found'], 404);
            }

            $balances = LeaveBalance::where([
                'leave_type_id' => $annualLeaveType->id,
                'year' => $year,
            ])->where('remaining_days', '>', 0)->get();

            $processed = 0;
            foreach ($balances as $balance) {
                $remainingDays = $balance->remaining_days;
                $carryForward = min($remainingDays, $annualLeaveType->max_carry_forward_days);

                // Update current year balance
                $balance->update([
                    'carry_forward' => $carryForward,
                    'remaining_days' => 0,
                ]);

                // Create next year balance with carry forward
                $nextBalance = LeaveBalance::firstOrCreate(
                    [
                        'employee_id' => $balance->employee_id,
                        'leave_type_id' => $annualLeaveType->id,
                        'year' => $nextYear,
                    ],
                    [
                        'base_entitlement' => $annualLeaveType->days_per_year,
                        'total_entitlement' => $annualLeaveType->days_per_year,
                        'remaining_days' => $annualLeaveType->days_per_year,
                    ]
                );

                $nextBalance->update([
                    'carry_forward' => $carryForward,
                    'total_entitlement' => $nextBalance->base_entitlement + $carryForward,
                    'remaining_days' => $nextBalance->remaining_days + $carryForward,
                ]);

                $processed++;
            }

            return response()->json([
                'status' => 'success',
                'message' => "Processed {$processed} employees for carry forward from {$year} to {$nextYear}",
            ]);
        } catch (\Exception $e) {
            \Log::error('Error processing carry forward: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to process carry forward: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ==================== NOTIFICATION METHODS ====================

    /**
     * Create a notification
     */
    private function createNotification($userId, $fromUserId, $type, $title, $message, $data = [])
    {
        return Notification::create([
            'user_id' => $userId,
            'from_user_id' => $fromUserId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
        ]);
    }

    /**
     * Get user's manager
     */
    private function getUserManager($employee)
    {
        if ($employee->manager_id) {
            return Employee::find($employee->manager_id);
        }

        // Fallback: cari HR atau Admin
        return Employee::whereHas('position', function ($q) {
            $q->whereIn('title', ['HR Manager', 'HR Officer', 'Admin']);
        })->first();
    }

    /**
     * Check if user is manager of the employee
     */
    private function isManagerOf($manager, $employee)
    {
        return $manager && $employee && $manager->id === $employee->manager_id;
    }

    // ==================== HELPER METHODS ====================

    /**
     * Check if user is Admin or HR
     */
    private function isAdminOrHR($user): bool
    {
        if (!$user || !$user->position) {
            return false;
        }

        $adminPositions = [
            'HR Manager',
            'HR Officer',
            'HR Assistant',
            'Admin',
            'System Admin',
            'Manager',
            'Director'
        ];

        return in_array($user->position->title ?? '', $adminPositions);
    }

    // app/Http/Controllers/Api/LeaveController.php
// Pastikan method ini ada

    /**
     * Get single balance detail (Admin/HR only)
     * GET /api/leaves/balance/{id}
     */
    public function getBalanceDetail($id): JsonResponse
    {
        try {
            $balance = LeaveBalance::with([
                'employee:id,first_name,last_name,employee_id,department_id',
                'employee.department:id,name',
                'leaveType:id,name,code,days_per_year',
                'adjustedBy:id,first_name,last_name'
            ])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $balance,
            ]);
        } catch (\Exception $e) {
            \Log::error('Get balance detail error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Balance not found',
            ], 404);
        }
    }

    /**
     * Update leave balance (Admin/HR only)
     * PUT /api/leaves/balance/{id}
     */
    public function updateBalance(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();

            // Check if user is Admin or HR
            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Only Admin/HR can edit leave balances',
                ], 403);
            }

            $balance = LeaveBalance::with(['employee', 'leaveType'])->findOrFail($id);

            $validator = Validator::make($request->all(), [
                'base_entitlement' => 'nullable|numeric|min:0',
                'manual_adjustment' => 'nullable|numeric',
                'adjustment_reason' => 'required_if:manual_adjustment,!=,0|string|min:5',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'errors' => $validator->errors(),
                ], 422);
            }

            DB::beginTransaction();
            try {
                $oldRemaining = $balance->remaining_days;
                $oldTotal = $balance->total_entitlement;

                // Update base entitlement if provided
                if ($request->has('base_entitlement')) {
                    $balance->base_entitlement = $request->base_entitlement;
                }

                // Update manual adjustment if provided
                if ($request->has('manual_adjustment') && $request->manual_adjustment != 0) {
                    $balance->manual_adjustment = $request->manual_adjustment;
                    $balance->adjustment_reason = $request->adjustment_reason;
                    $balance->adjusted_by = $user->id;
                    $balance->adjusted_at = now();
                }

                // Recalculate totals
                $balance->recalculateTotal();
                $balance->save();

                // Create notification for employee
                $this->createNotification(
                    $balance->employee_id,
                    $user->id,
                    'balance_adjusted',
                    'Leave Balance Updated',
                    "Your {$balance->leaveType->name} balance has been adjusted by HR. " .
                        "Previous: {$oldRemaining} days, New: {$balance->remaining_days} days.\n" .
                        "Reason: " . ($request->adjustment_reason ?? 'Manual adjustment'),
                    [
                        'balance_id' => $balance->id,
                        'leave_type' => $balance->leaveType->name,
                        'old_balance' => $oldRemaining,
                        'new_balance' => $balance->remaining_days,
                        'adjustment' => $request->manual_adjustment ?? 0,
                        'reason' => $request->adjustment_reason ?? 'Manual adjustment',
                    ]
                );

                DB::commit();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Leave balance updated successfully',
                    'data' => $balance->fresh()->load('leaveType', 'adjustedBy'),
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            \Log::error('Update balance error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update balance: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get adjustment history for employee
     */
    public function getAdjustmentHistory(Request $request, $employeeId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$this->isAdminOrHR($user)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized',
                ], 403);
            }

            $balances = LeaveBalance::where('employee_id', $employeeId)
                ->where(function ($q) {
                    $q->whereNotNull('adjusted_by')
                        ->orWhere('manual_adjustment', '!=', 0);
                })
                ->with(['leaveType', 'adjustedBy'])
                ->orderBy('adjusted_at', 'desc')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $balances,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch history',
            ], 500);
        }
    }

    /**
     * Calculate working days between two dates (exclude weekends)
     */
    private function calculateWorkingDays($startDate, $endDate): int
    {
        $days = 0;
        $current = $startDate->copy();

        while ($current <= $endDate) {
            if (!$current->isWeekend()) {
                $days++;
            }
            $current->addDay();
        }

        return max(1, $days);
    }

    /**
     * Ensure leave balance exists for employee
     */
    private function ensureBalanceExists(Employee $employee): void
    {
        $currentYear = date('Y');
        $leaveTypes = LeaveType::where('is_active', true)->get();

        foreach ($leaveTypes as $leaveType) {
            $exists = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $currentYear,
            ])->exists();

            if (!$exists) {
                $this->calculateAndCreateBalance($employee, $leaveType, $currentYear);
            }
        }
    }

    /**
     * Calculate and create balance for employee
     */
    private function calculateAndCreateBalance(Employee $employee, LeaveType $leaveType, int $year): void
    {
        $yearsOfService = Carbon::parse($employee->hire_date)->diffInYears(Carbon::now());
        $hireDate = Carbon::parse($employee->hire_date);

        // Base entitlement
        $baseEntitlement = $leaveType->days_per_year;

        // Seniority bonus (only for Annual Leave)
        $seniorityBonus = 0;
        if ($leaveType->code === 'AL') {
            if ($yearsOfService >= 6) {
                $seniorityBonus = 2;
            } elseif ($yearsOfService >= 3) {
                $seniorityBonus = 1;
            }
        }

        // Prorata for new employees (hired this year)
        if ($hireDate->year == $year && $hireDate->month > 1) {
            $monthsWorked = 12 - $hireDate->month + 1;
            $baseEntitlement = round(($baseEntitlement / 12) * $monthsWorked);
            $seniorityBonus = 0;
        }

        // Carry forward from previous year (only for Annual Leave)
        $carryForward = 0;
        if ($leaveType->code === 'AL' && $leaveType->allow_carry_forward) {
            $previousBalance = LeaveBalance::where([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year - 1,
            ])->first();

            if ($previousBalance && $previousBalance->remaining_days > 0) {
                $carryForward = min($previousBalance->remaining_days, $leaveType->max_carry_forward_days);
            }
        }

        // Get replacement days from previous balance
        $replacementDays = 0;
        $previousBalance = LeaveBalance::where([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'year' => $year - 1,
        ])->first();

        if ($previousBalance) {
            $replacementDays = $previousBalance->replacement_days;
        }

        // Calculate total entitlement
        $totalEntitlement = $baseEntitlement + $seniorityBonus + $carryForward + $replacementDays;

        LeaveBalance::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year,
            ],
            [
                'base_entitlement' => $baseEntitlement,
                'seniority_bonus' => $seniorityBonus,
                'carry_forward' => $carryForward,
                'replacement_days' => $replacementDays,
                'total_entitlement' => $totalEntitlement,
                'used_days' => 0,
                'pending_days' => 0,
                'remaining_days' => $totalEntitlement,
            ]
        );
    }
}
