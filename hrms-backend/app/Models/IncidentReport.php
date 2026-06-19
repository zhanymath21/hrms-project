<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class IncidentReport extends Model
{
    use HasFactory, SoftDeletes;

    // Status Constants
    const STATUS_REPORTED = 'reported';
    const STATUS_UNDER_INVESTIGATION = 'under_investigation';
    const STATUS_IN_REVIEW = 'in_review';
    const STATUS_RESOLVED = 'resolved';
    const STATUS_CLOSED = 'closed';
    const STATUS_REJECTED = 'rejected';

    // Approval Status Constants
    const APPROVAL_PENDING = 'pending';
    const APPROVAL_IN_PROGRESS = 'in_progress';
    const APPROVAL_APPROVED = 'approved';
    const APPROVAL_REJECTED = 'rejected';
    const APPROVAL_PARTIALLY_APPROVED = 'partially_approved';

    // Category Constants
    const CATEGORY_SAFETY = 'safety';
    const CATEGORY_SECURITY = 'security';
    const CATEGORY_HEALTH = 'health';
    const CATEGORY_PROPERTY_DAMAGE = 'property_damage';
    const CATEGORY_ENVIRONMENTAL = 'environmental';
    const CATEGORY_HARASSMENT = 'harassment';
    const CATEGORY_DISCRIMINATION = 'discrimination';
    const CATEGORY_FRAUD = 'fraud';
    const CATEGORY_THEFT = 'theft';
    const CATEGORY_DATA_BREACH = 'data_breach';
    const CATEGORY_POLICY_VIOLATION = 'policy_violation';
    const CATEGORY_WORKPLACE_VIOLENCE = 'workplace_violence';
    const CATEGORY_ACCIDENT = 'accident';
    const CATEGORY_NEAR_MISS = 'near_miss';
    const CATEGORY_OTHER = 'other';

    // Severity Constants
    const SEVERITY_LOW = 'low';
    const SEVERITY_MEDIUM = 'medium';
    const SEVERITY_HIGH = 'high';
    const SEVERITY_CRITICAL = 'critical';

    protected $fillable = [
        'reported_by',
        'assigned_to',
        'created_by',
        'title',
        'description',
        'location',
        'incident_date',
        'incident_time',
        'category',
        'severity',
        'status',
        'approval_status',
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
    ];

    protected $casts = [
        'incident_date' => 'date',
        'incident_time' => 'datetime',
        'resolved_date' => 'date',
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

    public function reportedBy()
    {
        return $this->belongsTo(Employee::class, 'reported_by');
    }

    public function assignedTo()
    {
        return $this->belongsTo(Employee::class, 'assigned_to');
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
        return $this->hasMany(IncidentStatusHistory::class)->orderBy('created_at', 'desc');
    }

    // ============ SCOPES ============

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeBySeverity($query, $severity)
    {
        return $query->where('severity', $severity);
    }

    public function scopeByApprovalStatus($query, $approvalStatus)
    {
        return $query->where('approval_status', $approvalStatus);
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_REPORTED);
    }

    public function scopeUnderInvestigation($query)
    {
        return $query->where('status', self::STATUS_UNDER_INVESTIGATION);
    }

    public function scopeResolved($query)
    {
        return $query->where('status', self::STATUS_RESOLVED);
    }

    // ============ ACCESSORS ============

    public function getStatusLabelAttribute()
    {
        $labels = [
            self::STATUS_REPORTED => 'Reported',
            self::STATUS_UNDER_INVESTIGATION => 'Under Investigation',
            self::STATUS_IN_REVIEW => 'In Review',
            self::STATUS_RESOLVED => 'Resolved',
            self::STATUS_CLOSED => 'Closed',
            self::STATUS_REJECTED => 'Rejected',
        ];
        return $labels[$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        $colors = [
            self::STATUS_REPORTED => '#f59e0b',
            self::STATUS_UNDER_INVESTIGATION => '#3b82f6',
            self::STATUS_IN_REVIEW => '#8b5cf6',
            self::STATUS_RESOLVED => '#10b981',
            self::STATUS_CLOSED => '#6b7280',
            self::STATUS_REJECTED => '#ef4444',
        ];
        return $colors[$this->status] ?? '#6b7280';
    }

    public function getApprovalStatusLabelAttribute()
    {
        $labels = [
            self::APPROVAL_PENDING => 'Pending',
            self::APPROVAL_IN_PROGRESS => 'In Progress',
            self::APPROVAL_APPROVED => 'Approved',
            self::APPROVAL_REJECTED => 'Rejected',
            self::APPROVAL_PARTIALLY_APPROVED => 'Partially Approved',
        ];
        return $labels[$this->approval_status] ?? $this->approval_status;
    }

    public function getApprovalStatusColorAttribute()
    {
        $colors = [
            self::APPROVAL_PENDING => '#f59e0b',
            self::APPROVAL_IN_PROGRESS => '#3b82f6',
            self::APPROVAL_APPROVED => '#10b981',
            self::APPROVAL_REJECTED => '#ef4444',
            self::APPROVAL_PARTIALLY_APPROVED => '#8b5cf6',
        ];
        return $colors[$this->approval_status] ?? '#6b7280';
    }

    public function getCategoryLabelAttribute()
    {
        $labels = [
            self::CATEGORY_SAFETY => 'Safety',
            self::CATEGORY_SECURITY => 'Security',
            self::CATEGORY_HEALTH => 'Health',
            self::CATEGORY_PROPERTY_DAMAGE => 'Property Damage',
            self::CATEGORY_ENVIRONMENTAL => 'Environmental',
            self::CATEGORY_HARASSMENT => 'Harassment',
            self::CATEGORY_DISCRIMINATION => 'Discrimination',
            self::CATEGORY_FRAUD => 'Fraud',
            self::CATEGORY_THEFT => 'Theft',
            self::CATEGORY_DATA_BREACH => 'Data Breach',
            self::CATEGORY_POLICY_VIOLATION => 'Policy Violation',
            self::CATEGORY_WORKPLACE_VIOLENCE => 'Workplace Violence',
            self::CATEGORY_ACCIDENT => 'Accident',
            self::CATEGORY_NEAR_MISS => 'Near Miss',
            self::CATEGORY_OTHER => 'Other',
        ];
        return $labels[$this->category] ?? $this->category;
    }

    public function getSeverityLabelAttribute()
    {
        $labels = [
            self::SEVERITY_LOW => 'Low',
            self::SEVERITY_MEDIUM => 'Medium',
            self::SEVERITY_HIGH => 'High',
            self::SEVERITY_CRITICAL => 'Critical',
        ];
        return $labels[$this->severity] ?? $this->severity;
    }

    public function getSeverityColorAttribute()
    {
        $colors = [
            self::SEVERITY_LOW => '#10b981',
            self::SEVERITY_MEDIUM => '#f59e0b',
            self::SEVERITY_HIGH => '#f97316',
            self::SEVERITY_CRITICAL => '#ef4444',
        ];
        return $colors[$this->severity] ?? '#6b7280';
    }

    public function getApprovalProgressAttribute()
    {
        if (!$this->approval_flow) return 0;

        $flow = json_decode($this->approval_flow, true);
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
                    'notes' => $history->notes,
                    'changed_by' => $history->updatedBy ?
                        $history->updatedBy->first_name . ' ' . $history->updatedBy->last_name :
                        'System',
                    'created_at' => $history->created_at,
                ];
            });
    }

    // ============ HELPER METHODS ============

    public function createHistoryRecord($oldStatus, $newStatus, $oldApprovalStatus = null, $newApprovalStatus = null, $notes = null)
    {
        return IncidentStatusHistory::create([
            'incident_report_id' => $this->id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus ?? $this->status,
            'old_approval_status' => $oldApprovalStatus,
            'new_approval_status' => $newApprovalStatus ?? $this->approval_status,
            'notes' => $notes ?? 'Status updated',
            'updated_by' => auth()->id() ?? null,
        ]);
    }

    public function updateApprovalStatus()
    {
        if (!$this->approval_flow) {
            $this->approval_status = self::APPROVAL_APPROVED;
            $this->save();
            return;
        }

        $flow = json_decode($this->approval_flow, true);
        if (!is_array($flow) || empty($flow)) {
            $this->approval_status = self::APPROVAL_APPROVED;
            $this->save();
            return;
        }

        $total = count($flow);
        $approved = 0;
        $rejected = 0;

        foreach ($flow as $index => $manager) {
            $statusField = 'manager' . ($index + 1) . '_status';
            if ($this->$statusField === 'approved') {
                $approved++;
            } elseif ($this->$statusField === 'rejected') {
                $rejected++;
            }
        }

        if ($rejected > 0) {
            $this->approval_status = self::APPROVAL_REJECTED;
        } elseif ($approved === $total) {
            $this->approval_status = self::APPROVAL_APPROVED;
        } elseif ($approved > 0 && $approved < $total) {
            $this->approval_status = self::APPROVAL_PARTIALLY_APPROVED;
        } else {
            $this->approval_status = self::APPROVAL_IN_PROGRESS;
        }

        $this->save();
    }

    // ============ BOOT METHOD ============

    protected static function boot()
    {
        parent::boot();

        static::created(function ($incident) {
            IncidentStatusHistory::create([
                'incident_report_id' => $incident->id,
                'old_status' => null,
                'new_status' => $incident->status ?? 'reported',
                'old_approval_status' => null,
                'new_approval_status' => $incident->approval_status ?? 'pending',
                'notes' => 'Incident report created',
                'updated_by' => auth()->id() ?? null,
            ]);
        });

        static::updating(function ($incident) {
            $historyData = [
                'incident_report_id' => $incident->id,
                'updated_by' => auth()->id() ?? null,
            ];

            if ($incident->isDirty('status')) {
                $historyData['old_status'] = $incident->getOriginal('status');
                $historyData['new_status'] = $incident->status;
            }

            if ($incident->isDirty('approval_status')) {
                $historyData['old_approval_status'] = $incident->getOriginal('approval_status');
                $historyData['new_approval_status'] = $incident->approval_status;
            }

            if (isset($historyData['old_status']) || isset($historyData['old_approval_status'])) {
                IncidentStatusHistory::create($historyData);
            }
        });
    }
}
