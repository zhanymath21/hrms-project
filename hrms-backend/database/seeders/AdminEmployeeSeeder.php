<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;
use Illuminate\Support\Facades\Hash;

class AdminEmployeeSeeder extends Seeder
{
    public function run()
    {
        Employee::create([
            'employee_id' => 'EMP20240001',
            'first_name' => 'System',
            'last_name' => 'Admin',
            'email' => 'admin@hrms.com',
            'password' => Hash::make('password123'),
            'phone' => '+1234567890',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'address' => '123 Admin Street',
            'hire_date' => '2024-01-01',
            'department_id' => 1, // HR Department
            'position_id' => 1, // HR Manager
            'employment_type' => 'full_time',
            'status' => 'active',
            'salary' => 50000.00,
            'emergency_contact_name' => 'Emergency Contact',
            'emergency_contact_phone' => '+0987654321',
            'emergency_contact_relation' => 'Spouse',
        ]);
    }
}