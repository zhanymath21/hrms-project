<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PPEHistory extends Model
{
    use HasFactory;

    protected $table = 'ppe_histories';

    protected $fillable = [
        'ppe_item_id',
        'action_type',
        'old_data',
        'new_data',
        'description',
        'notes',
        'performed_by',
        'performed_by_name',
    ];

    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
    ];

    public function ppeItem()
    {
        return $this->belongsTo(PPEItem::class);
    }

    public function performer()
    {
        return $this->belongsTo(Employee::class, 'performed_by');
    }
}
