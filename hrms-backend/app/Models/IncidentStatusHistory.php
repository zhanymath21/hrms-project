<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IncidentStatusHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'incident_report_id',
        'old_status',
        'new_status',
        'old_approval_status',
        'new_approval_status',
        'notes',
        'updated_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function incidentReport()
    {
        return $this->belongsTo(IncidentReport::class);
    }

    public function updatedBy()
    {
        return $this->belongsTo(Employee::class, 'updated_by');
    }
}
