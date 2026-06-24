<?php

namespace Database\Factories;

use App\Models\Holiday;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class HolidayFactory extends Factory
{
    protected $model = Holiday::class;

    public function definition()
    {
        $holidays = [
            ['name' => 'New Year\'s Day', 'date' => '2024-01-01'],
            ['name' => 'International Women\'s Day', 'date' => '2024-03-08'],
            ['name' => 'Khmer New Year', 'date' => '2024-04-13'],
            ['name' => 'Labour Day', 'date' => '2024-05-01'],
            ['name' => 'King\'s Birthday', 'date' => '2024-05-13'],
            ['name' => 'Pchum Ben', 'date' => '2024-10-01'],
            ['name' => 'Independence Day', 'date' => '2024-11-09'],
            ['name' => 'Water Festival', 'date' => '2024-11-14'],
            ['name' => 'Human Rights Day', 'date' => '2024-12-10'],
        ];

        $holiday = $this->faker->randomElement($holidays);

        return [
            'name' => $holiday['name'],
            'date' => $holiday['date'],
            'description' => $this->faker->optional(0.5)->sentence,
            'is_recurring' => $this->faker->boolean(70),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * Indicate that the holiday is recurring.
     */
    public function recurring()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_recurring' => true,
            ];
        });
    }

    /**
     * Indicate that the holiday is not recurring.
     */
    public function nonRecurring()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_recurring' => false,
            ];
        });
    }
}
