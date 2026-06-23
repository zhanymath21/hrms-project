<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;
use App\Models\EmployeeSalarySetting;
use Illuminate\Support\Facades\Hash;

class EmployeeSeeder extends Seeder
{
    public function run()
    {
        $employees = $this->createEmployees();

        // Return employees for use in other seeders
        $this->command->info('✅ ' . count($employees) . ' employees created with salary settings');

        return $employees;
    }

    public function createEmployees()
    {
        $employees = [];

        // Employee 1: HR Manager
        $employee1 = Employee::updateOrCreate(
            ['email' => 'hr.manager@company.com'],
            [
                'first_name' => 'Sokha',
                'last_name' => 'Chea',
                'employee_id' => 'EMP001',
                'password' => Hash::make('password123'), // Add this
                'phone' => '012345678',
                'gender' => 'female',
                'hire_date' => '2020-01-15',
                'employment_status' => 'permanent',
                'employment_type' => 'full_time',
                'status' => 'active',
                'position_id' => 1,
                'department_id' => 1,
                'salary' => 2500000,
            ]
        );
        $employees[] = $employee1;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee1->id],
            [
                'basic_salary' => 2500000,
                'housing_allowance' => 300000,
                'transport_allowance' => 150000,
                'meal_allowance' => 80000,
                'phone_allowance' => 50000,
                'other_allowance' => 100000,
                'dependents' => 2,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ACLEDA Bank',
                'bank_account_number' => '1234567890',
                'bank_account_name' => 'Sokha Chea',
                'currency' => 'KHR',
            ]
        );

        // Employee 2: HR Officer
        $employee2 = Employee::updateOrCreate(
            ['email' => 'hr.officer@company.com'],
            [
                'first_name' => 'Dara',
                'last_name' => 'Sok',
                'employee_id' => 'EMP002',
                'password' => Hash::make('password123'), // Add this
                'phone' => '012345679',
                'gender' => 'male',
                'hire_date' => '2021-06-01',
                'employment_status' => 'permanent',
                'employment_type' => 'full_time',
                'status' => 'active',
                'position_id' => 2,
                'department_id' => 1,
                'salary' => 1800000,
            ]
        );
        $employees[] = $employee2;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee2->id],
            [
                'basic_salary' => 1800000,
                'housing_allowance' => 200000,
                'transport_allowance' => 100000,
                'meal_allowance' => 60000,
                'phone_allowance' => 30000,
                'other_allowance' => 50000,
                'dependents' => 1,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ABA Bank',
                'bank_account_number' => '2345678901',
                'bank_account_name' => 'Dara Sok',
                'currency' => 'KHR',
            ]
        );

        // Employee 3: IT Manager
        $employee3 = Employee::updateOrCreate(
            ['email' => 'it.manager@company.com'],
            [
                'first_name' => 'Rithy',
                'last_name' => 'Kong',
                'employee_id' => 'EMP003',
                'password' => Hash::make('password123'), // Add this
                'phone' => '012345680',
                'gender' => 'male',
                'hire_date' => '2019-03-10',
                'employment_status' => 'permanent',
                'employment_type' => 'full_time',
                'status' => 'active',
                'position_id' => 3,
                'department_id' => 2,
                'salary' => 3000000,
            ]
        );
        $employees[] = $employee3;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee3->id],
            [
                'basic_salary' => 3000000,
                'housing_allowance' => 400000,
                'transport_allowance' => 200000,
                'meal_allowance' => 100000,
                'phone_allowance' => 80000,
                'other_allowance' => 150000,
                'dependents' => 3,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ACLEDA Bank',
                'bank_account_number' => '3456789012',
                'bank_account_name' => 'Rithy Kong',
                'currency' => 'KHR',
            ]
        );

        // Employee 4: Finance Manager
        $employee4 = Employee::updateOrCreate(
            ['email' => 'finance.manager@company.com'],
            [
                'first_name' => 'Sreymom',
                'last_name' => 'Khun',
                'employee_id' => 'EMP004',
                'password' => Hash::make('password123'), // Add this
                'phone' => '012345681',
                'gender' => 'female',
                'hire_date' => '2020-08-20',
                'employment_status' => 'permanent',
                'employment_type' => 'full_time',
                'status' => 'active',
                'position_id' => 4,
                'department_id' => 3,
                'salary' => 2800000,
            ]
        );
        $employees[] = $employee4;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee4->id],
            [
                'basic_salary' => 2800000,
                'housing_allowance' => 350000,
                'transport_allowance' => 180000,
                'meal_allowance' => 90000,
                'phone_allowance' => 60000,
                'other_allowance' => 120000,
                'dependents' => 2,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ABA Bank',
                'bank_account_number' => '4567890123',
                'bank_account_name' => 'Sreymom Khun',
                'currency' => 'KHR',
            ]
        );

        // Employee 5: Marketing Executive
        $employee5 = Employee::updateOrCreate(
            ['email' => 'marketing.exec@company.com'],
            [
                'first_name' => 'Vannak',
                'last_name' => 'Chhin',
                'employee_id' => 'EMP005',
                'password' => Hash::make('password123'), // Add this
                'phone' => '012345682',
                'gender' => 'male',
                'hire_date' => '2022-01-15',
                'employment_status' => 'probation',
                'employment_type' => 'full_time',
                'status' => 'active',
                'position_id' => 5,
                'department_id' => 4,
                'salary' => 1500000,
            ]
        );
        $employees[] = $employee5;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee5->id],
            [
                'basic_salary' => 1500000,
                'housing_allowance' => 150000,
                'transport_allowance' => 80000,
                'meal_allowance' => 50000,
                'phone_allowance' => 20000,
                'other_allowance' => 30000,
                'dependents' => 0,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ACLEDA Bank',
                'bank_account_number' => '5678901234',
                'bank_account_name' => 'Vannak Chhin',
                'currency' => 'KHR',
            ]
        );

        // Employee 6: Sales Executive (Part-time)
        $employee6 = Employee::updateOrCreate(
            ['email' => 'sales.exec@company.com'],
            [
                'first_name' => 'Chan',
                'last_name' => 'Nou',
                'employee_id' => 'EMP006',
                'password' => Hash::make('password123'), // Add this
                'phone' => '012345683',
                'gender' => 'female',
                'hire_date' => '2022-03-01',
                'employment_status' => 'contract',
                'employment_type' => 'part_time',
                'status' => 'active',
                'position_id' => 6,
                'department_id' => 5,
                'salary' => 1200000,
            ]
        );
        $employees[] = $employee6;

        EmployeeSalarySetting::updateOrCreate(
            ['employee_id' => $employee6->id],
            [
                'basic_salary' => 1200000,
                'housing_allowance' => 100000,
                'transport_allowance' => 60000,
                'meal_allowance' => 40000,
                'phone_allowance' => 15000,
                'other_allowance' => 20000,
                'dependents' => 1,
                'is_tax_exempt' => false,
                'payment_method' => 'bank_transfer',
                'bank_name' => 'ABA Bank',
                'bank_account_number' => '6789012345',
                'bank_account_name' => 'Chan Nou',
                'currency' => 'KHR',
            ]
        );

        return $employees;
    }
}
