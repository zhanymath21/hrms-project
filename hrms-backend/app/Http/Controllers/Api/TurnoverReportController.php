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
     */
    public function stats(Request $request): JsonResponse
    {
        $year = $request->year ?? date('Y');
        $departmentId = $request->department_id;

        $totalEmployees = Employee::when($departmentId, fn($q) => $q->where('department_id', $departmentId))
            ->whereDate('join_date', '<=', "$year-01-01")->count();

        $resignedCount = Employee::whereYear('resign_date', $year)
            ->when($departmentId, fn($q) => $q->where('department_id', $departmentId))
            ->count();

        $prevResigned = Employee::whereYear('resign_date', $year - 1)->count();
        $prevTotal = Employee::whereDate('join_date', '<=', ($year - 1) . '-01-01')->count();
        $prevRate = $prevTotal > 0 ? round(($prevResigned / $prevTotal) * 100, 1) : 0;

        $turnoverRate = $totalEmployees > 0 ? round(($resignedCount / $totalEmployees) * 100, 1) : 0;

        $activeEmployees = Employee::whereNull('resign_date')
            ->when($departmentId, fn($q) => $q->where('department_id', $departmentId))
            ->count();

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
    }

    /**
     * Resigned Employees List
     */
    public function resigned(Request $request): JsonResponse
    {
        $year = $request->year ?? date('Y');
        $month = $request->month;
        $departmentId = $request->department_id;

        $employees = Employee::with(['department', 'position'])
            ->whereYear('resign_date', $year)
            ->when($month, fn($q) => $q->whereMonth('resign_date', $month))
            ->when($departmentId, fn($q) => $q->where('department_id', $departmentId))
            ->orderBy('resign_date', 'desc')
            ->get()
            ->map(function ($emp) {
                $duration = null;
                if ($emp->join_date && $emp->resign_date) {
                    $diff = Carbon::parse($emp->join_date)->diff(Carbon::parse($emp->resign_date));
                    $duration = $diff->y > 0
                        ? "{$diff->y}y {$diff->m}m"
                        : "{$diff->m}m {$diff->d}d";
                }

                return [
                    'id' => $emp->id,
                    'employee_id' => $emp->employee_id,
                    'employee_name' => $emp->first_name . ' ' . $emp->last_name,
                    'department_name' => $emp->department->name ?? '-',
                    'position_title' => $emp->position->title ?? '-',
                    'join_date' => $emp->join_date,
                    'resign_date' => $emp->resign_date,
                    'duration' => $duration ?? '-',
                    'reason' => $emp->resign_reason ?? '-',
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $employees,
        ]);
    }

    /**
     * Turnover by Department
     */
    public function byDepartment(Request $request): JsonResponse
    {
        $year = $request->year ?? date('Y');

        $data = Department::withCount([
            'employees as total_employees' => fn($q) => $q->whereDate('join_date', '<=', "$year-01-01")
        ])
            ->withCount([
                'employees as resigned_count' => fn($q) => $q->whereYear('resign_date', $year)
            ])
            ->get()
            ->map(function ($dept) {
                return [
                    'name' => $dept->name,
                    'code' => $dept->code,
                    'total_employees' => $dept->total_employees,
                    'resigned_count' => $dept->resigned_count,
                    'turnover_rate' => $dept->total_employees > 0
                        ? round(($dept->resigned_count / $dept->total_employees) * 100, 1) : 0,
                ];
            });

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    /**
     * Turnover by Month
     */
    public function byMonth(Request $request): JsonResponse
    {
        $year = $request->year ?? date('Y');
        $departmentId = $request->department_id;

        $data = Employee::select(DB::raw('MONTH(resign_date) as month'), DB::raw('COUNT(*) as resigned_count'))
            ->whereYear('resign_date', $year)
            ->when($departmentId, fn($q) => $q->where('department_id', $departmentId))
            ->groupBy(DB::raw('MONTH(resign_date)'))
            ->orderBy('month')
            ->get();

        // Fill all 12 months
        $result = collect(range(1, 12))->map(function ($month) use ($data) {
            $found = $data->firstWhere('month', $month);
            return [
                'month' => $month,
                'resigned_count' => $found ? (int) $found->resigned_count : 0,
            ];
        });

        return response()->json(['status' => 'success', 'data' => $result]);
    }

    /**
     * Yearly Summary (3 years)
     */
    public function summary(): JsonResponse
    {
        $years = range(date('Y') - 3, date('Y'));

        $data = collect($years)->map(function ($year) {
            $total = Employee::whereDate('join_date', '<=', "$year-01-01")->count();
            $resigned = Employee::whereYear('resign_date', $year)->count();
            return [
                'year' => $year,
                'total_employees' => $total,
                'resigned_count' => $resigned,
                'turnover_rate' => $total > 0 ? round(($resigned / $total) * 100, 1) : 0,
            ];
        });

        return response()->json(['status' => 'success', 'data' => $data]);
    }
}
