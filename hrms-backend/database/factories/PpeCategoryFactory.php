<?php

namespace Database\Factories;

use App\Models\PpeCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class PpeCategoryFactory extends Factory
{
    protected $model = PpeCategory::class;

    public function definition()
    {
        $categories = [
            ['name' => 'Head Protection', 'code' => 'HEAD'],
            ['name' => 'Eye & Face Protection', 'code' => 'EYE'],
            ['name' => 'Hearing Protection', 'code' => 'EAR'],
            ['name' => 'Respiratory Protection', 'code' => 'RESP'],
            ['name' => 'Hand Protection', 'code' => 'HAND'],
            ['name' => 'Foot Protection', 'code' => 'FOOT'],
            ['name' => 'Body Protection', 'code' => 'BODY'],
            ['name' => 'Fall Protection', 'code' => 'FALL'],
            ['name' => 'High Visibility', 'code' => 'HIVIS'],
            ['name' => 'Chemical Protection', 'code' => 'CHEM'],
            ['name' => 'Electrical Protection', 'code' => 'ELEC'],
            ['name' => 'Thermal Protection', 'code' => 'THERM'],
        ];

        $category = $this->faker->randomElement($categories);

        return [
            'name' => $category['name'],
            'code' => $category['code'],
            'description' => $this->faker->optional(0.7)->sentence,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
