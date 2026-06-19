<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Onboarding extends Model
{
    use HasFactory, SoftDeletes;

    // Status Constants
    const STATUS_PENDING = 'pending';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_ON_HOLD = 'on_hold';

    protected $fillable = [
        'candidate_id',
        'employee_id',
        'vacancy_id',
        'position_title',
        'start_date',
        'expected_end_date',
        'actual_end_date',
        'status',
        'progress',
        'notes',
        'tasks',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'expected_end_date' => 'date',
        'actual_end_date' => 'date',
        'progress' => 'integer',
        'tasks' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // ============ RELATIONSHIPS ============

    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function vacancy()
    {
        return $this->belongsTo(Vacancy::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(Employee::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(Employee::class, 'updated_by');
    }

    public function statusHistories()
    {
        return $this->hasMany(OnboardingStatusHistory::class)->orderBy('created_at', 'desc');
    }

    // ============ SCOPES ============

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', self::STATUS_IN_PROGRESS);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByCandidate($query, $candidateId)
    {
        return $query->where('candidate_id', $candidateId);
    }

    public function scopeByEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    // ============ ACCESSORS ============

    public function getStatusLabelAttribute()
    {
        $labels = [
            self::STATUS_PENDING => 'Pending',
            self::STATUS_IN_PROGRESS => 'In Progress',
            self::STATUS_COMPLETED => 'Completed',
            self::STATUS_CANCELLED => 'Cancelled',
            self::STATUS_ON_HOLD => 'On Hold',
        ];

        return $labels[$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        $colors = [
            self::STATUS_PENDING => '#f59e0b',
            self::STATUS_IN_PROGRESS => '#3b82f6',
            self::STATUS_COMPLETED => '#10b981',
            self::STATUS_CANCELLED => '#ef4444',
            self::STATUS_ON_HOLD => '#8b5cf6',
        ];

        return $colors[$this->status] ?? '#6b7280';
    }

    public function getStatusHistoryWithUsersAttribute()
    {
        return $this->statusHistories()
            ->with('updatedBy')
            ->get()
            ->map(function ($history) {
                return [
                    'id' => $history->id,
                    'old_status' => $history->old_status,
                    'new_status' => $history->new_status,
                    'old_progress' => $history->old_progress,
                    'new_progress' => $history->new_progress,
                    'notes' => $history->notes,
                    'changed_by' => $history->updatedBy ?
                        $history->updatedBy->first_name . ' ' . $history->updatedBy->last_name :
                        'System',
                    'changed_by_id' => $history->updated_by,
                    'created_at' => $history->created_at,
                ];
            });
    }

    public function getTasksListAttribute()
    {
        return $this->tasks ?? [];
    }

    public function getCompletedTasksCountAttribute()
    {
        if (!$this->tasks) return 0;
        return collect($this->tasks)->where('completed', true)->count();
    }

    public function getTotalTasksCountAttribute()
    {
        if (!$this->tasks) return 0;
        return count($this->tasks);
    }

    // ============ BOOT METHOD ============

    protected static function boot()
    {
        parent::boot();

        static::created(function ($onboarding) {
            OnboardingStatusHistory::create([
                'onboarding_id' => $onboarding->id,
                'old_status' => null,
                'new_status' => $onboarding->status ?? 'pending',
                'old_progress' => null,
                'new_progress' => $onboarding->progress ?? 0,
                'notes' => 'Onboarding created',
                'updated_by' => auth()->id() ?? null,
            ]);
        });

        static::updating(function ($onboarding) {
            $changes = [];

            if ($onboarding->isDirty('status')) {
                $changes['old_status'] = $onboarding->getOriginal('status');
                $changes['new_status'] = $onboarding->status;
            }

            if ($onboarding->isDirty('progress')) {
                $changes['old_progress'] = $onboarding->getOriginal('progress');
                $changes['new_progress'] = $onboarding->progress;
            }

            if (!empty($changes)) {
                OnboardingStatusHistory::create(array_merge([
                    'onboarding_id' => $onboarding->id,
                    'notes' => $onboarding->notes ?? null,
                    'updated_by' => auth()->id() ?? null,
                ], $changes));
            }
        });
    }

    // ============ HELPER METHODS ============

    public function updateProgress()
    {
        if ($this->tasks) {
            $tasks = collect($this->tasks);
            $completed = $tasks->where('completed', true)->count();
            $total = $tasks->count();
            $progress = $total > 0 ? round(($completed / $total) * 100) : 0;

            $this->progress = $progress;
            $this->save();
        }
    }

    public function completeOnboarding()
    {
        $this->status = self::STATUS_COMPLETED;
        $this->progress = 100;
        $this->actual_end_date = now();
        $this->save();
    }

    public function cancelOnboarding($reason = null)
    {
        $this->status = self::STATUS_CANCELLED;
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') . "Cancelled: " . $reason;
        }
        $this->save();
    }
}
