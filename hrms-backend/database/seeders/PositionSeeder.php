<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Position;

class PositionSeeder extends Seeder
{
    public function run()
    {
        $positions = [
            // HR
            ['title' => 'HR Manager', 'code' => 'HR-MGR', 'department_id' => 1, 'description' => 'Human Resources Manager'],
            ['title' => 'HR Officer', 'code' => 'HR-OFF', 'department_id' => 1, 'description' => 'Human Resources Officer'],

            // IT
            ['title' => 'IT Manager', 'code' => 'IT-MGR', 'department_id' => 2, 'description' => 'IT Manager'],
            ['title' => 'Software Developer', 'code' => 'IT-DEV', 'department_id' => 2, 'description' => 'Software Developer'],
            ['title' => 'System Administrator', 'code' => 'IT-SYS', 'department_id' => 2, 'description' => 'System Administrator'],

            // Finance
            ['title' => 'Finance Manager', 'code' => 'FIN-MGR', 'department_id' => 3, 'description' => 'Finance Manager'],
            ['title' => 'Accountant', 'code' => 'FIN-ACC', 'department_id' => 3, 'description' => 'Accountant'],

            // Marketing
            ['title' => 'Marketing Manager', 'code' => 'MKT-MGR', 'department_id' => 4, 'description' => 'Marketing Manager'],
            ['title' => 'Marketing Specialist', 'code' => 'MKT-SPC', 'department_id' => 4, 'description' => 'Marketing Specialist'],

            // Sales
            ['title' => 'Sales Manager', 'code' => 'SAL-MGR', 'department_id' => 5, 'description' => 'Sales Manager'],
            ['title' => 'Sales Representative', 'code' => 'SAL-REP', 'department_id' => 5, 'description' => 'Sales Representative'],

            // Operations
            ['title' => 'Operations Manager', 'code' => 'OPS-MGR', 'department_id' => 6, 'description' => 'Operations Manager'],
            ['title' => 'Operations Coordinator', 'code' => 'OPS-COR', 'department_id' => 6, 'description' => 'Operations Coordinator'],
        ];

        foreach ($positions as $position) {
            Position::create($position);
        }
    }
}