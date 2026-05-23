<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'category_id',
        'title',
        'description',
        'file_path',
        'file_name',
        'file_type',
        'file_size',
        'expiry_date',
        'is_verified',
        'uploaded_by',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'is_verified' => 'boolean',
        'file_size' => 'integer',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function category()
    {
        return $this->belongsTo(DocumentCategory::class, 'category_id');
    }

    public function uploader()
    {
        return $this->belongsTo(Employee::class, 'uploaded_by');
    }
}