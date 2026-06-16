<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Department;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TurnoverReportController extends Controller
{
    /**
     * Turnover Statistics
     * GET /api/reports/turnover
     */
    public function stats(Request $request): JsonResponse
    {
        try {
            $year = $request->year ?? date('Y');
            $departmentId = $request->department_id;

            // Total employees hired before or during the year
            $totalQuery = Employee::query();
            if ($departmentId) {
                $totalQuery->where('department_id', $departmentId);
            }
            $totalEmployees = $totalQuery->whereDate('hire_date', '<=', "$year-12-31")->count();

            // Resigned = employees with status 'terminated' AND deleted_at in that year
            $resignedQuery = Employee::onlyTrashed()
                ->whereYear('deleted_at', $year);
            if ($departmentId) {
                $resignedQuery->where('department_id', $departmentId);
            }
            $resignedCount = $resignedQuery->count();

            // Previous year
            $prevResigned = Employee::onlyTrashed()
                ->whereYear('deleted_at', $year - 1)
                ->count();
            $prevTotal = Employee::whereDate('hire_date', '<=', ($year - 1) . '-12-31')->count();
            $prevRate = $prevTotal > 0 ? round(($prevResigned / $prevTotal) * 100, 1) : 0;

            // Current rate
            $turnoverRate = $totalEmployees > 0 ? round(($resignedCount / $totalEmployees) * 100, 1) : 0;

            // Active employees
            $activeQuery = Employee::where('status', 'active');
            if ($departmentId) {
                $activeQuery->where('department_id', $departmentId);
            }
            $activeEmployees = $activeQuery->count();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'total_employees' => $totalEmployees,
                    'resigned_count' => $resignedCount,
                    'turnover_rate' => $turnoverRate,
                    'previous_rate' => $prevRate,
                    'active_employees' => $activeEmployees,
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Turnover stats error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resigned Employees List
     * GET /api/reports/turnover/resigned
     */
    public function resigned(Request $request): JsonResponse
    {
        try {
            $year = $request->year ?? date('Y');
            $month = $request->month;
            $departmentId = $request->department_id;

            $query = Employee::onlyTrashed()
                ->with(['department:id,name,code', 'position:id,title'])
                ->whereYear('deleted_at', $year);

            if ($month) {
                $query->whereMonth('deleted_at', $month);
            }
            if ($departmentId) {
                $query->where('department_id', $departmentId);
            }

            $employees = $query->orderBy('deleted_at', 'desc')
                ->get()
                ->map(function ($emp) {
                    $duration = null;
                    if ($emp->hire_date && $emp->deleted_at) {
                        $diff = Carbon::parse($emp->hire_date)->diff(Carbon::parse($emp->deleted_at));
                        $duration = $diff->y > 0
                            ? "{$diff->y}y {$diff->m}m"
                            : "{$diff->m}m {$diff->d}d";
                    }

                    return [
                        'id' => $emp->id,
                        'employee_id' => $emp->employee_id,
                        'employee_name' => $emp->first_name . ' ' . $emp->last_name,
                        'nik' => $emp->employee_id,
                        'department_id' => $emp->department_id,
                        'department_name' => $emp->department->name ?? '-',
                        'position_title' => $emp->position->title ?? '-',
                        'join_date' => $emp->hire_date,
                        'hire_date' => $emp->hire_date,
                        'resign_date' => $emp->deleted_at ? $emp->deleted_at->format('Y-m-d') : null,
                        'resignation_date' => $emp->deleted_at ? $emp->deleted_at->format('Y-m-d') : null,
                        'duration' => $duration ?? '-',
                        'reason' => $emp->notes ?? $emp->termination_reason ?? '-',
                        'status' => 'terminated',
                    ];
                });

            return response()->json([
                'status' => 'success',
                'data' => $employees,
            ]);
        } catch (\Exception $e) {
            \Log::error('Turnover resigned error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Turnover by Department
     * GET /api/reports/turnover/by-department
     */
    public function byDepartment(Request $request): JsonResponse
    {
        try {
            $year = $request->year ?? date('Y');

            $data = Department::withCount([
                'employees as total_employees' => function ($q) use ($year) {
                    $q->whereDate('hire_date', '<=', "$year-12-31");
                }
            ])
                ->withCount([
                    'employees as resigned_count' => function ($q) use ($year) {
                        $q->onlyTrashed()->whereYear('deleted_at', $year);
                    }
                ])
                ->get()
                ->map(function ($dept) {
                    $rate = $dept->total_employees > 0
                        ? round(($dept->resigned_count / $dept->total_employees) * 100, 1)
                        : 0;

                    return [
                        'department_id' => $dept->id,
                        'name' => $dept->name,
                        'department_name' => $dept->name,
                        'code' => $dept->code,
                        'total_employees' => $dept->total_employees,
                        'resigned_count' => $dept->resigned_count,
                        'turnover_rate' => $rate,
                    ];
                });

            return response()->json(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            \Log::error('Turnover by dept error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Turnover by Month
     * GET /api/reports/turnover/by-month
     */
    public function byMonth(Request $request): JsonResponse
    {
        try {
            $year = $request->year ?? date('Y');
            $departmentId = $request->department_id;

            $query = Employee::onlyTrashed()
                ->select(
                    DB::raw('MONTH(deleted_at) as month'),
                    DB::raw('COUNT(*) as resigned_count')
                )
                ->whereYear('deleted_at', $year);

            if ($departmentId) {
                $query->where('department_id', $departmentId);
            }

            $data = $query->groupBy(DB::raw('MONTH(deleted_at)'))
                ->orderBy('month')
                ->get();

            // Fill all 12 months
            $result = collect(range(1, 12))->map(function ($month) use ($data) {
                $found = $data->firstWhere('month', $month);
                return [
                    'month' => (int) $month,
                    'resigned_count' => $found ? (int) $found->resigned_count : 0,
                ];
            });

            return response()->json(['status' => 'success', 'data' => $result]);
        } catch (\Exception $e) {
            \Log::error('Turnover by month error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Yearly Summary (3 years)
     * GET /api/reports/turnover/summary
     */
    public function summary(): JsonResponse
    {
        try {
            $years = range(date('Y') - 3, date('Y'));

            $data = collect($years)->map(function ($year) {
                $total = Employee::whereDate('hire_date', '<=', "$year-12-31")->count();
                $resigned = Employee::onlyTrashed()->whereYear('deleted_at', $year)->count();

                return [
                    'year' => (int) $year,
                    'total_employees' => $total,
                    'resigned_count' => $resigned,
                    'turnover_rate' => $total > 0 ? round(($resigned / $total) * 100, 1) : 0,
                ];
            });

            return response()->json(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            \Log::error('Turnover summary error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
