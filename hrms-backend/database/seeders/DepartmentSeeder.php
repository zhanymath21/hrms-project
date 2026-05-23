<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Department;

class DepartmentSeeder extends Seeder
{
    public function run()
    {
        $departments = [
            ['name' => 'Human Resources', 'code' => 'HR', 'description' => 'Human Resources Department'],
            ['name' => 'Information Technology', 'code' => 'IT', 'description' => 'IT Department'],
            ['name' => 'Finance', 'code' => 'FIN', 'description' => 'Finance Department'],
            ['name' => 'Marketing', 'code' => 'MKT', 'description' => 'Marketing Department'],
            ['name' => 'Sales', 'code' => 'SAL', 'description' => 'Sales Department'],
            ['name' => 'Operations', 'code' => 'OPS', 'description' => 'Operations Department'],
        ];

        foreach ($departments as $department) {
            Department::create($department);
        }
    }
}