<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LostTimeInjury extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'reported_by',
        'created_by',
        'title',
        'description',
        'location',
        'injury_date',
        'injury_time',
        'body_part',
        'injury_type',
        'severity',
        'medical_treatment',
        'return_to_work_date',
        'days_lost',
        'medical_notes',
        'status',
        'resolution_notes',
        'resolved_date',
        'file_path',
        'file_name',
        'witnesses',
        'approval_flow',
        'manager1_id',
        'manager1_status',
        'manager1_approved_at',
        'manager1_notes',
        'manager2_id',
        'manager2_status',
        'manager2_approved_at',
        'manager2_notes',
        'manager3_id',
        'manager3_status',
        'manager3_approved_at',
        'manager3_notes',
        'manager4_id',
        'manager4_status',
        'manager4_approved_at',
        'manager4_notes',
        'approval_status',
    ];

    protected $casts = [
        'injury_date' => 'date',
        'injury_time' => 'datetime',
        'return_to_work_date' => 'date',
        'resolved_date' => 'date',
        'medical_treatment' => 'boolean',
        'days_lost' => 'integer',
        'witnesses' => 'array',
        'approval_flow' => 'array',
        'manager1_approved_at' => 'datetime',
        'manager2_approved_at' => 'datetime',
        'manager3_approved_at' => 'datetime',
        'manager4_approved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // ============ RELATIONSHIPS ============

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function reportedBy()
    {
        return $this->belongsTo(Employee::class, 'reported_by');
    }

    public function createdBy()
    {
        return $this->belongsTo(Employee::class, 'created_by');
    }

    public function manager1()
    {
        return $this->belongsTo(Employee::class, 'manager1_id');
    }

    public function manager2()
    {
        return $this->belongsTo(Employee::class, 'manager2_id');
    }

    public function manager3()
    {
        return $this->belongsTo(Employee::class, 'manager3_id');
    }

    public function manager4()
    {
        return $this->belongsTo(Employee::class, 'manager4_id');
    }

    public function statusHistories()
    {
        return $this->hasMany(LostTimeInjuryHistory::class)->orderBy('created_at', 'desc');
    }

    // ============ SCOPES ============

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeBySeverity($query, $severity)
    {
        return $query->where('severity', $severity);
    }

    // ============ ACCESSORS ============

    public function getStatusLabelAttribute()
    {
        $labels = [
            'reported' => 'Reported',
            'under_investigation' => 'Under Investigation',
            'in_review' => 'In Review',
            'resolved' => 'Resolved',
            'closed' => 'Closed',
            'rejected' => 'Rejected',
        ];
        return $labels[$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        $colors = [
            'reported' => '#f59e0b',
            'under_investigation' => '#3b82f6',
            'in_review' => '#8b5cf6',
            'resolved' => '#10b981',
            'closed' => '#6b7280',
            'rejected' => '#ef4444',
        ];
        return $colors[$this->status] ?? '#6b7280';
    }

    public function getApprovalStatusLabelAttribute()
    {
        $labels = [
            'pending' => 'Pending',
            'in_progress' => 'In Progress',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'partially_approved' => 'Partially Approved',
        ];
        return $labels[$this->approval_status] ?? $this->approval_status;
    }

    public function getApprovalStatusColorAttribute()
    {
        $colors = [
            'pending' => '#f59e0b',
            'in_progress' => '#3b82f6',
            'approved' => '#10b981',
            'rejected' => '#ef4444',
            'partially_approved' => '#8b5cf6',
        ];
        return $colors[$this->approval_status] ?? '#6b7280';
    }

    public function getSeverityLabelAttribute()
    {
        $labels = [
            'minor' => 'Minor',
            'moderate' => 'Moderate',
            'severe' => 'Severe',
            'critical' => 'Critical',
        ];
        return $labels[$this->severity] ?? $this->severity;
    }

    public function getSeverityColorAttribute()
    {
        $colors = [
            'minor' => '#10b981',
            'moderate' => '#f59e0b',
            'severe' => '#f97316',
            'critical' => '#ef4444',
        ];
        return $colors[$this->severity] ?? '#6b7280';
    }

    public function getIsFinalStatusAttribute()
    {
        return in_array($this->status, ['resolved', 'closed', 'rejected']);
    }

    public function getApprovalProgressAttribute()
    {
        if (!$this->approval_flow) return 0;

        $flow = is_string($this->approval_flow) ? json_decode($this->approval_flow, true) : $this->approval_flow;
        if (!is_array($flow)) return 0;

        $total = count($flow);
        $approved = 0;

        foreach ($flow as $index => $manager) {
            $statusField = 'manager' . ($index + 1) . '_status';
            if ($this->$statusField === 'approved') {
                $approved++;
            }
        }

        return $total > 0 ? round(($approved / $total) * 100) : 0;
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
                    'old_approval_status' => $history->old_approval_status,
                    'new_approval_status' => $history->new_approval_status,
                    'old_days_lost' => $history->old_days_lost,
                    'new_days_lost' => $history->new_days_lost,
                    'notes' => $history->notes,
                    'changed_by' => $history->updatedBy ?
                        $history->updatedBy->first_name . ' ' . $history->updatedBy->last_name :
                        'System',
                    'created_at' => $history->created_at,
                ];
            });
    }

    // ============ BOOT METHOD ============

    protected static function boot()
    {
        parent::boot();

        static::created(function ($lti) {
            LostTimeInjuryHistory::create([
                'lost_time_injury_id' => $lti->id,
                'old_status' => null,
                'new_status' => $lti->status ?? 'reported',
                'old_approval_status' => null,
                'new_approval_status' => $lti->approval_status ?? 'pending',
                'old_days_lost' => null,
                'new_days_lost' => $lti->days_lost ?? 0,
                'notes' => 'Lost Time Injury created',
                'updated_by' => auth()->id() ?? null,
            ]);
        });

        static::updating(function ($lti) {
            $historyData = [
                'lost_time_injury_id' => $lti->id,
                'updated_by' => auth()->id() ?? null,
            ];

            if ($lti->isDirty('status')) {
                $historyData['old_status'] = $lti->getOriginal('status');
                $historyData['new_status'] = $lti->status;
            }

            if ($lti->isDirty('approval_status')) {
                $historyData['old_approval_status'] = $lti->getOriginal('approval_status');
                $historyData['new_approval_status'] = $lti->approval_status;
            }

            if ($lti->isDirty('days_lost')) {
                $historyData['old_days_lost'] = $lti->getOriginal('days_lost');
                $historyData['new_days_lost'] = $lti->days_lost;
            }

            if (!isset($historyData['notes'])) {
                $historyData['notes'] = 'Record updated';
            }

            if (isset($historyData['old_status']) || isset($historyData['old_approval_status']) || isset($historyData['old_days_lost'])) {
                LostTimeInjuryHistory::create($historyData);
            }
        });
    }
}
