<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DocumentCategory;

class DocumentCategorySeeder extends Seeder
{
    public function run()
    {
        $categories = [
            ['name' => 'Identity Documents', 'code' => 'ID', 'description' => 'National ID, Passport, etc.'],
            ['name' => 'Educational Certificates', 'code' => 'EDU', 'description' => 'Degrees, Diplomas, Certifications'],
            ['name' => 'Employment Contracts', 'code' => 'CONTRACT', 'description' => 'Employment contracts and agreements'],
            ['name' => 'Performance Reviews', 'code' => 'PERF', 'description' => 'Performance evaluation documents'],
            ['name' => 'Medical Records', 'code' => 'MED', 'description' => 'Medical certificates and records'],
            ['name' => 'Training Certificates', 'code' => 'TRN', 'description' => 'Training completion certificates'],
        ];

        foreach ($categories as $category) {
            DocumentCategory::create($category);
        }
    }
}