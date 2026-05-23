<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\OfficeLocation;

class OfficeLocationSeeder extends Seeder
{
    public function run()
    {
        $locations = [
            [
                'name' => 'Kantor Pusat',
                'code' => 'HQ',
                'address' => 'Jl. Sudirman No. 123, Jakarta',
                'latitude' => -6.2088,  // Ganti dengan koordinat kantor
                'longitude' => 106.8456,
                'radius_meters' => 100,
                'is_active' => true,
            ],
            [
                'name' => 'Kantor Cabang',
                'code' => 'BRANCH',
                'address' => 'Jl. Thamrin No. 456, Jakarta',
                'latitude' => -6.1823,
                'longitude' => 106.8234,
                'radius_meters' => 150,
                'is_active' => true,
            ],
        ];

        foreach ($locations as $location) {
            OfficeLocation::create($location);
        }
    }
}