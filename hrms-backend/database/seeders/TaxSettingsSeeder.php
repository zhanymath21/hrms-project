<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TaxSetting;

class TaxSettingsSeeder extends Seeder
{
    public function run()
    {
        $taxBrackets = [
            [
                'threshold' => 0,
                'rate' => 0,
                'description' => '0% - No tax'
            ],
            [
                'threshold' => 1500000,
                'rate' => 5,
                'description' => '5% on first 1,500,000 KHR'
            ],
            [
                'threshold' => 2000000,
                'rate' => 10,
                'description' => '10% on next 2,000,000 KHR'
            ],
            [
                'threshold' => 8500000,
                'rate' => 15,
                'description' => '15% on next 8,500,000 KHR'
            ],
            [
                'threshold' => 12500000,
                'rate' => 20,
                'description' => '20% on next 12,500,000 KHR'
            ],
        ];

        $socialSecurityBrackets = [
            'max_salary' => 1200000,
        ];

        TaxSetting::updateOrCreate(
            ['year' => date('Y')],
            [
                'tax_brackets' => $taxBrackets,
                'personal_relief' => 1500000,
                'dependent_relief' => 150000,
                'nssf_employee_rate' => 2.5,
                'nssf_employer_rate' => 2.5,
                'social_security_brackets' => $socialSecurityBrackets,
                'minimum_wage' => 1000000,
                'is_active' => true,
                'notes' => 'Cambodia Tax Settings ' . date('Y'),
            ]
        );

        $this->command->info('✅ Tax settings created');
    }
}
