<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PublicHoliday;

class PublicHolidaySeeder extends Seeder
{
    public function run()
    {
        $holidays = [
            ['name' => "New Year's Day", 'date' => '2026-01-01', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'Victory over Genocide Day', 'date' => '2026-01-07', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'International Women\'s Day', 'date' => '2026-03-08', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'Khmer New Year Day 1', 'date' => '2026-04-14', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'Khmer New Year Day 2', 'date' => '2026-04-15', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'Khmer New Year Day 3', 'date' => '2026-04-16', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'International Labour Day', 'date' => '2026-05-01', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'King\'s Birthday', 'date' => '2026-05-14', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'Pchum Ben Day 1', 'date' => '2026-09-26', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'Pchum Ben Day 2', 'date' => '2026-09-27', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'Independence Day', 'date' => '2026-11-09', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'Water Festival Day 1', 'date' => '2026-11-14', 'year' => 2026, 'is_recurring' => true],
            ['name' => 'Water Festival Day 2', 'date' => '2026-11-15', 'year' => 2026, 'is_recurring' => true],
        ];

        foreach ($holidays as $holiday) {
            PublicHoliday::create($holiday);
        }
    }
}
