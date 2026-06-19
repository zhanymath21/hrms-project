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

    // ============ HELPER METHODS ============

    public function updateProgress()
    {
        if ($this->tasks) {
            $tasks = collect($this->tasks);
            $completed = $tasks->where('completed', true)->count();
            $total = $tasks->count();
            $progress = $total > 0 ? round(($completed / $total) * 100) : 0;

            $oldProgress = $this->progress;
            $oldStatus = $this->status;

            $this->progress = $progress;

            // Auto-update status based on progress
            if ($progress == 100 && $this->status !== self::STATUS_COMPLETED) {
                $this->status = self::STATUS_COMPLETED;
                $this->actual_end_date = now();
            } elseif ($progress > 0 && $this->status === self::STATUS_PENDING) {
                $this->status = self::STATUS_IN_PROGRESS;
            } elseif ($progress == 0 && $this->status === self::STATUS_IN_PROGRESS) {
                $this->status = self::STATUS_PENDING;
            }

            $this->save();

            // Create history if progress or status changed
            if ($oldProgress != $progress || $oldStatus != $this->status) {
                $this->createHistoryRecord(
                    $oldStatus,
                    $this->status,
                    $oldProgress,
                    $progress,
                    'Progress updated via tasks'
                );
            }
        }
    }

    public function createHistoryRecord($oldStatus, $newStatus, $oldProgress = null, $newProgress = null, $notes = null)
    {
        return OnboardingStatusHistory::create([
            'onboarding_id' => $this->id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus ?? $this->status,
            'old_progress' => $oldProgress ?? $this->progress,
            'new_progress' => $newProgress ?? $this->progress,
            'notes' => $notes ?? 'Status updated',
            'updated_by' => auth()->id() ?? null,
        ]);
    }

    public function completeOnboarding()
    {
        $oldStatus = $this->status;
        $oldProgress = $this->progress;

        $this->status = self::STATUS_COMPLETED;
        $this->progress = 100;
        $this->actual_end_date = now();
        $this->save();

        $this->createHistoryRecord(
            $oldStatus,
            $this->status,
            $oldProgress,
            100,
            'Onboarding completed'
        );
    }

    public function cancelOnboarding($reason = null)
    {
        $oldStatus = $this->status;
        $oldProgress = $this->progress;

        $this->status = self::STATUS_CANCELLED;
        if ($reason) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') . "Cancelled: " . $reason;
        }
        $this->actual_end_date = now();
        $this->save();

        $this->createHistoryRecord(
            $oldStatus,
            $this->status,
            $oldProgress,
            $this->progress,
            'Onboarding cancelled: ' . ($reason ?? 'No reason provided')
        );
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
            // Only create history if there are changes
            if ($onboarding->isDirty() || $onboarding->isDirty('status') || $onboarding->isDirty('progress')) {
                $historyData = [
                    'onboarding_id' => $onboarding->id,
                    'new_status' => $onboarding->status, // Always provide current status
                    'updated_by' => auth()->id() ?? null,
                ];

                // Status changes
                if ($onboarding->isDirty('status')) {
                    $historyData['old_status'] = $onboarding->getOriginal('status');
                }

                // Progress changes
                if ($onboarding->isDirty('progress')) {
                    $historyData['old_progress'] = $onboarding->getOriginal('progress');
                    $historyData['new_progress'] = $onboarding->progress;
                }

                // Notes
                if ($onboarding->isDirty('notes') && $onboarding->notes) {
                    $historyData['notes'] = $onboarding->notes;
                }

                // Only create if we have changes to track
                if (isset($historyData['old_status']) || isset($historyData['old_progress'])) {
                    OnboardingStatusHistory::create($historyData);
                }
            }
        });
    }
}
