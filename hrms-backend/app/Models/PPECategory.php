<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PPECategory extends Model
{
    use HasFactory;

    protected $table = 'ppe_categories';

    protected $fillable = [
        'name',
        'code',
        'description',
    ];

    /**
     * Get all PPE items in this category
     */
    public function items()
    {
        return $this->hasMany(PPEItem::class, 'category_id');
    }

    /**
     * Count active items in this category
     */
    public function activeItemsCount()
    {
        return $this->items()->whereNotIn('status', ['write_off'])->count();
    }

    /**
     * Count available items
     */
    public function availableItemsCount()
    {
        return $this->items()->where('status', 'available')->count();
    }

    /**
     * Count assigned items
     */
    public function assignedItemsCount()
    {
        return $this->items()->where('status', 'assigned')->count();
    }
}
