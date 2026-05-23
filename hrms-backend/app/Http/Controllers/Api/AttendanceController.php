<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\EmployeeOfficeLocation;
use App\Models\EmployeeSchedule;
use App\Models\OfficeLocation;
use App\Services\CacheService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttendanceController extends Controller
{
    /**
     * Check-in with geofencing - ALL OFFICES (tidak perlu assign)
     */
    public function checkIn(Request $request): JsonResponse
    {
        $employee = $request->user();
        $today = Carbon::today();
        $now = Carbon::now();

        // Check active schedule
        $employeeSchedule = EmployeeSchedule::getActiveSchedule($employee->id);
        if (!$employeeSchedule) {
            return response()->json([
                'status' => 'error',
                'message' => 'No active schedule. Please contact HR to assign a shift.',
            ], 422);
        }

        $latitude = $request->latitude;
        $longitude = $request->longitude;
        $checkInMethod = $request->method ?? 'mobile';

        // Untuk check-in mobile/web, validasi lokasi
        if (in_array($checkInMethod, ['mobile', 'web']) && $latitude && $longitude) {

            // GET ALL ACTIVE OFFICE LOCATIONS (bukan assigned)
            $activeOffices = OfficeLocation::where('is_active', true)->get();

            // Jika tidak ada office yang aktif, izinkan check-in dimana saja
            if ($activeOffices->isEmpty()) {
                return $this->processCheckIn($request, $employee, $today, $now, $employeeSchedule, null);
            }

            // Cek apakah employee berada di salah satu office
            $matchedOffice = null;
            $nearestOffice = null;
            $nearestDistance = PHP_FLOAT_MAX;

            foreach ($activeOffices as $office) {
                $distance = $this->calculateDistance(
                    $office->latitude,
                    $office->longitude,
                    $latitude,
                    $longitude
                );

                if ($distance < $nearestDistance) {
                    $nearestDistance = $distance;
                    $nearestOffice = $office;
                }

                if ($distance <= $office->radius_meters) {
                    $matchedOffice = $office;
                    break;
                }
            }

            if (!$matchedOffice) {
                // Tampilkan semua office locations
                $allOfficesInfo = $activeOffices->map(function ($office) use ($latitude, $longitude) {
                    $dist = $this->calculateDistance(
                        $office->latitude,
                        $office->longitude,
                        $latitude,
                        $longitude
                    );
                    return [
                        'id' => $office->id,
                        'name' => $office->name,
                        'address' => $office->address,
                        'radius_meters' => $office->radius_meters,
                        'distance_meters' => round($dist),
                        'is_within' => $dist <= $office->radius_meters,
                    ];
                });

                return response()->json([
                    'status' => 'error',
                    'message' => "You are not within any office area.\n\n" .
                        "Nearest office: {$nearestOffice->name} - " . round($nearestDistance) . "m away " .
                        "(max radius: {$nearestOffice->radius_meters}m)\n\n" .
                        "You can check-in from any of these locations:",
                    'data' => [
                        'your_location' => [
                            'latitude' => (float) $latitude,
                            'longitude' => (float) $longitude,
                        ],
                        'nearest_office' => [
                            'name' => $nearestOffice->name,
                            'address' => $nearestOffice->address,
                            'distance_meters' => round($nearestDistance),
                            'max_radius' => $nearestOffice->radius_meters,
                        ],
                        'all_offices' => $allOfficesInfo,
                    ],
                ], 422);
            }

            // Found matching office
            return $this->processCheckIn($request, $employee, $today, $now, $employeeSchedule, $matchedOffice);
        }

        // Card check-in atau method lain
        return $this->processCheckIn($request, $employee, $today, $now, $employeeSchedule, null);
    }

    /**
     * Save photo from base64 or file upload
     */
    private function savePhoto($request, $prefix = 'check_in'): ?string
    {
        // Check if file upload
        if ($request->hasFile('photo')) {
            return $request->file('photo')->store(
                'attendance-photos/' . now()->format('Y/m'),
                'public'
            );
        }

        // Check if base64 upload (from web)
        if ($request->filled('photo_base64')) {
            $base64Image = $request->photo_base64;
            $extension = $request->photo_extension ?? 'jpg';

            // Remove data:image prefix if exists
            if (str_contains($base64Image, 'base64,')) {
                $base64Image = explode('base64,', $base64Image)[1];
            }

            $imageData = base64_decode($base64Image);
            $fileName = 'attendance-photos/' . now()->format('Y/m') . '/' . uniqid() . '.' . $extension;

            Storage::disk('public')->put($fileName, $imageData);

            return $fileName;
        }

        return null;
    }
    /**
     * Process check-in logic
     */
    private function processCheckIn(
        Request $request,
        $employee,
        $today,
        $now,
        $employeeSchedule,
        $matchedOffice = null
    ): JsonResponse {
        // Get or create today's attendance
        $attendance = Attendance::firstOrCreate(
            [
                'employee_id' => $employee->id,
                'date' => $today,
            ],
            [
                'status' => 'present',
                'first_check_in' => $now->format('H:i:s'),
            ]
        );

        // Check active session
        $activeSession = $attendance->sessions()
            ->where('status', 'ongoing')
            ->first();

        if ($activeSession) {
            return response()->json([
                'status' => 'error',
                'message' => "You have an ongoing session #{$activeSession->session_number}. Please check-out first.",
            ], 422);
        }

        // Session number
        $sessionNumber = $attendance->sessions()->count() + 1;
        $schedule = $employeeSchedule->workSchedule;

        // Determine max sessions based on schedule
        $maxSessions = $schedule->break_start_time ? 2 : 1;

        if ($sessionNumber > $maxSessions) {
            return response()->json([
                'status' => 'error',
                'message' => "Maximum {$maxSessions} session(s) for your schedule.",
            ], 422);
        }

        // Handle photo upload
        $photoPath = $this->savePhoto($request, 'check_in');
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store(
                'attendance-photos/' . $today->format('Y/m'),
                'public'
            );
        } elseif ($request->has('photo_base64') && !empty($request->photo_base64)) {
            $base64Image = $request->photo_base64;

            // Remove data:image prefix if exists
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $matches)) {
                $base64Image = substr($base64Image, strpos($base64Image, ',') + 1);
            }

            $imageData = base64_decode($base64Image);

            if ($imageData !== false) {
                $fileName = 'attendance-photos/' . $today->format('Y/m') . '/' . uniqid() . '.jpg';
                Storage::disk('public')->put($fileName, $imageData);
                $photoPath = $fileName;
            }
        }

        // Late detection
        $isLate = false;
        $lateMinutes = 0;

        if ($sessionNumber === 1) {
            $startTime = Carbon::parse($schedule->start_time);
            $graceTime = $startTime->copy()->addMinutes(15);

            if ($now->gt($graceTime)) {
                $isLate = true;
                $lateMinutes = $startTime->diffInMinutes($now);
                $attendance->update(['status' => 'late']);
            }
        } elseif ($sessionNumber === 2 && $schedule->break_end_time) {
            $breakEnd = Carbon::parse($schedule->break_end_time);
            $graceTime = $breakEnd->copy()->addMinutes(5);

            if ($now->gt($graceTime)) {
                $isLate = true;
                $lateMinutes = $breakEnd->diffInMinutes($now);
            }
        }

        // Location description
        $locationDesc = $request->location ?? 'Office';
        if ($matchedOffice) {
            $locationDesc = "{$matchedOffice->name} - {$matchedOffice->address}";
        }

        // Create session
        $session = AttendanceSession::create([
            'attendance_id' => $attendance->id,
            'employee_id' => $employee->id,
            'date' => $today,
            'session_number' => $sessionNumber,
            'check_in_time' => $now->format('H:i:s'),
            'check_in_photo' => $photoPath,
            'check_in_method' => $request->method ?? 'mobile',
            'check_in_location' => $locationDesc,
            'check_in_ip' => $request->ip(),
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'status' => 'ongoing',
            'work_schedule_id' => $schedule->id,
            'schedule_start_time' => $sessionNumber === 1
                ? $schedule->start_time
                : $schedule->break_end_time,
            'schedule_end_time' => $sessionNumber === 1
                ? ($schedule->break_start_time ?? $schedule->end_time)
                : $schedule->end_time,
            'is_late' => $isLate,
            'late_minutes' => $lateMinutes,
        ]);

        // Update attendance
        $attendance->update([
            'first_check_in' => $attendance->first_check_in ?? $now->format('H:i:s'),
        ]);

        $responseData = [
            'session' => $session,
            'session_number' => $sessionNumber,
            'is_late' => $isLate,
            'late_minutes' => $lateMinutes,
            'photo_url' => $photoPath ? asset('storage/' . $photoPath) : null,
        ];

        if ($matchedOffice) {
            $responseData['office'] = [
                'name' => $matchedOffice->name,
                'address' => $matchedOffice->address,
                'is_within_radius' => true,
            ];
        }

        return response()->json([
            'status' => 'success',
            'message' => "Check-in #{$sessionNumber} successful at " . ($matchedOffice?->name ?? 'Office') .
                ($isLate ? " (Late: {$lateMinutes}min)" : ''),
            'data' => $responseData,
        ]);
    }

    /**
     * Check-out with photo
     */
    public function checkOut(Request $request): JsonResponse
    {
        $employee = $request->user();
        $today = Carbon::today();
        $now = Carbon::now();

        $attendance = Attendance::where('employee_id', $employee->id)
            ->whereDate('date', $today)
            ->first();

        if (!$attendance) {
            return response()->json([
                'status' => 'error',
                'message' => 'Please check-in first.',
            ], 422);
        }

        $activeSession = $attendance->sessions()
            ->where('status', 'ongoing')
            ->first();

        if (!$activeSession) {
            return response()->json([
                'status' => 'error',
                'message' => 'No active session found.',
            ], 422);
        }

        // Handle photo
        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store(
                'attendance-photos/' . $today->format('Y/m'),
                'public'
            );
        }

        // Calculate hours
        $checkIn = Carbon::parse($activeSession->check_in_time);
        $sessionHours = round($checkIn->diffInMinutes($now) / 60, 2);

        // Update session
        $activeSession->update([
            'check_out_time' => $now->format('H:i:s'),
            'check_out_photo' => $photoPath,
            'check_out_method' => $request->method ?? 'mobile',
            'check_out_location' => $request->location ?? 'Office',
            'session_hours' => $sessionHours,
            'status' => 'completed',
        ]);

        // Update summary
        $completedSessions = $attendance->sessions()
            ->where('status', 'completed')
            ->count();
        $totalHours = $attendance->sessions()
            ->where('status', 'completed')
            ->sum('session_hours');
        $overtime = max(0, $totalHours - 8);

        $attendance->update([
            'total_sessions' => $completedSessions,
            'total_hours' => round($totalHours, 2),
            'overtime_hours' => round($overtime, 2),
            'last_check_out' => $now->format('H:i:s'),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Check-out successful',
            'data' => [
                'session_number' => $activeSession->session_number,
                'session_hours' => $sessionHours,
                'total_hours_today' => round($totalHours, 2),
                'total_sessions_today' => $completedSessions,
                'photo_url' => $photoPath ? asset('storage/' . $photoPath) : null,
            ],
        ]);
    }

    /**
     * Check-in dengan kartu
     */
    public function checkInWithCard(Request $request): JsonResponse
    {
        $request->validate([
            'card_number' => 'required|string',
        ]);

        $employee = \App\Models\Employee::where('card_number', $request->card_number)
            ->where('use_card', true)
            ->where('status', 'active')
            ->first();

        if (!$employee) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid card or employee not found.',
            ], 404);
        }

        $checkInRequest = new Request([
            'method' => 'card',
            'card_id' => $request->card_number,
            'location' => $request->location ?? 'Card Reader',
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
        ]);

        $checkInRequest->setUserResolver(function () use ($employee) {
            return $employee;
        });

        return $this->checkIn($checkInRequest);
    }

    /**
     * Check-out dengan kartu
     */
    public function checkOutWithCard(Request $request): JsonResponse
    {
        $request->validate([
            'card_number' => 'required|string',
        ]);

        $employee = \App\Models\Employee::where('card_number', $request->card_number)
            ->where('use_card', true)
            ->where('status', 'active')
            ->first();

        if (!$employee) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid card or employee not found.',
            ], 404);
        }

        $checkOutRequest = new Request([
            'method' => 'card',
            'card_id' => $request->card_number,
            'location' => $request->location ?? 'Card Reader',
        ]);

        $checkOutRequest->setUserResolver(function () use ($employee) {
            return $employee;
        });

        return $this->checkOut($checkOutRequest);
    }

    /**
     * Calculate distance between two coordinates (Haversine)
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2): float
    {
        $earthRadius = 6371000; // meters

        $lat1 = deg2rad($lat1);
        $lon1 = deg2rad($lon1);
        $lat2 = deg2rad($lat2);
        $lon2 = deg2rad($lon2);

        $latDelta = $lat2 - $lat1;
        $lonDelta = $lon2 - $lon1;

        $a = sin($latDelta / 2) * sin($latDelta / 2) +
            cos($lat1) * cos($lat2) *
            sin($lonDelta / 2) * sin($lonDelta / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    public function today(Request $request): JsonResponse
    {
        try {
            $employeeId = $request->user()->id;
            $cacheKey = "attendance_today_{$employeeId}";

            $data = CacheService::remember($cacheKey, function () use ($request) {
                $employee = $request->user();
                $today = Carbon::today();

                $attendance = Attendance::with(['sessions' => function ($q) {
                    $q->select(
                        'id',
                        'attendance_id',
                        'session_number',
                        'check_in_time',
                        'check_out_time',
                        'session_hours',
                        'status',
                        'is_late',
                        'late_minutes'
                    )
                        ->orderBy('session_number');
                }])
                    ->where('employee_id', $employee->id)
                    ->whereDate('date', $today)
                    ->select(
                        'id',
                        'employee_id',
                        'date',
                        'status',
                        'total_hours',
                        'overtime_hours',
                        'total_sessions',
                        'first_check_in',
                        'last_check_out'
                    )
                    ->first();

                // Default data structure dari fungsi kedua
                $data = [
                    'date' => $today->format('Y-m-d'),
                    'current_time' => Carbon::now()->format('H:i:s'),
                    'can_checkin' => true,
                    'can_checkout' => false,
                    'next_session_number' => 1,
                    'remaining_sessions' => 2,
                    'has_active_session' => false,
                    'active_session_number' => null,
                ];

                if ($attendance) {
                    $activeSession = $attendance->sessions()
                        ->where('status', 'ongoing')
                        ->first();

                    $completedCount = $attendance->sessions()
                        ->where('status', 'completed')
                        ->count();

                    $data = [
                        'date' => $today->format('Y-m-d'),
                        'current_time' => Carbon::now()->format('H:i:s'),
                        'attendance' => [
                            'id' => $attendance->id,
                            'status' => $attendance->status,
                            'total_hours' => $attendance->total_hours ?? 0,
                            'overtime_hours' => $attendance->overtime_hours ?? 0,
                            'total_sessions' => $completedCount,
                            'sessions' => $attendance->sessions->map(function ($s) {
                                return [
                                    'session_number' => $s->session_number,
                                    'check_in_time' => $s->check_in_time,
                                    'check_out_time' => $s->check_out_time,
                                    'session_hours' => $s->session_hours ?? 0,
                                    'status' => $s->status,
                                    'is_late' => $s->is_late,
                                    'late_minutes' => $s->late_minutes,
                                ];
                            }),
                        ],
                        'has_active_session' => !is_null($activeSession),
                        'active_session_number' => $activeSession?->session_number,
                        'can_checkin' => is_null($activeSession) && $completedCount < 2,
                        'can_checkout' => !is_null($activeSession),
                        'next_session_number' => $completedCount + 1,
                        'remaining_sessions' => 2 - $completedCount,
                    ];
                }

                return $data;
            }, 1); // Cache 1 menit untuk attendance

            return response()->json(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            \Log::error('Today attendance error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch attendance',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    /**
     * Get monthly attendance report
     */
    public function report(Request $request): JsonResponse
    {
        try {
            $employeeId = $request->employee_id ?? $request->user()->id;
            $month = $request->month ?? Carbon::now()->month;
            $year = $request->year ?? Carbon::now()->year;

            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth();

            $attendances = Attendance::with('sessions')
                ->where('employee_id', $employeeId)
                ->whereBetween('date', [$startDate, $endDate])
                ->orderBy('date', 'desc')
                ->get();

            // Calculate working days
            $workingDays = 0;
            $current = $startDate->copy();
            while ($current <= $endDate) {
                if (!$current->isWeekend()) {
                    $workingDays++;
                }
                $current->addDay();
            }

            $summary = [
                'working_days' => $workingDays,
                'present_days' => $attendances->whereIn('status', ['present', 'late'])->count(),
                'absent_days' => $attendances->where('status', 'absent')->count(),
                'late_days' => $attendances->where('status', 'late')->count(),
                'total_hours' => round($attendances->sum('total_hours'), 2),
                'overtime_hours' => round($attendances->sum('overtime_hours'), 2),
                'total_sessions' => $attendances->sum('total_sessions'),
                'average_hours' => $attendances->count() > 0
                    ? round($attendances->avg('total_hours'), 2)
                    : 0,
            ];

            return response()->json([
                'status' => 'success',
                'data' => [
                    'summary' => $summary,
                    'attendances' => $attendances,
                    'month' => $month,
                    'year' => $year,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Report error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch report',
            ], 500);
        }
    }

    // app/Http/Controllers/Api/AttendanceController.php

    /**
     * Get attendance history with filters (for admin/HR)
     */
    public function history(Request $request): JsonResponse
    {
        try {
            $query = Attendance::with([
                'employee:id,employee_id,first_name,last_name,email,department_id,position_id',
                'employee.department:id,name',
                'employee.position:id,title',
                'sessions' => function ($q) {
                    $q->select('id', 'attendance_id', 'session_number', 'check_in_time', 'check_out_time', 'session_hours', 'status')
                        ->orderBy('session_number');
                }
            ])->orderBy('date', 'desc');

            // Filter by employee
            if ($request->filled('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            // Filter by date range
            if ($request->filled('start_date')) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->where('date', '<=', $request->end_date);
            }

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            // Filter by department
            if ($request->filled('department_id')) {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('department_id', $request->department_id);
                });
            }

            // Search by employee name or ID
            if ($request->filled('search')) {
                $search = $request->search;
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            }

            $perPage = min((int) $request->input('per_page', 15), 100);
            $attendances = $query->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $attendances,
            ]);
        } catch (\Exception $e) {
            \Log::error('Attendance history error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch attendance history',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get attendance for a specific date range (for export)
     */
    public function exportRange(Request $request): JsonResponse
    {
        try {
            $query = Attendance::with([
                'employee:id,employee_id,first_name,last_name,email,department_id,position_id',
                'employee.department:id,name',
                'employee.position:id,title',
            ]);

            if ($request->filled('start_date')) {
                $query->where('date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->where('date', '<=', $request->end_date);
            }

            $attendances = $query->orderBy('date', 'desc')->get();

            return response()->json([
                'status' => 'success',
                'data' => $attendances,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch attendance data',
            ], 500);
        }
    }

    /**
     * Get daily attendance summary for a date
     */
    public function dailySummary(Request $request): JsonResponse
    {
        try {
            $date = $request->date ?? now()->format('Y-m-d');

            $summary = [
                'date' => $date,
                'total_employees' => 0,
                'present' => 0,
                'absent' => 0,
                'late' => 0,
                'half_day' => 0,
                'on_time' => 0,
                'total_hours' => 0,
                'total_overtime' => 0,
            ];

            $attendances = Attendance::with('employee')
                ->where('date', $date)
                ->get();

            $summary['total_employees'] = $attendances->count();
            $summary['present'] = $attendances->whereIn('status', ['present', 'late'])->count();
            $summary['absent'] = $attendances->where('status', 'absent')->count();
            $summary['late'] = $attendances->where('status', 'late')->count();
            $summary['half_day'] = $attendances->where('status', 'half_day')->count();
            $summary['on_time'] = $attendances->where('is_late', false)->count();
            $summary['total_hours'] = round($attendances->sum('total_hours'), 2);
            $summary['total_overtime'] = round($attendances->sum('overtime_hours'), 2);

            return response()->json([
                'status' => 'success',
                'data' => $summary,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch daily summary',
            ], 500);
        }
    }
}
