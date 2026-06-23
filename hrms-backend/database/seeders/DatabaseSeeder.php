<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            TaxSettingsSeeder::class,
            EmployeeSeeder::class,
            PayrollPeriodSeeder::class,
            PayrollItemSeeder::class,
            DepartmentSeeder::class,
            PositionSeeder::class,
            VacancySeeder::class,
            WorkScheduleSeeder::class,
            AdminEmployeeSeeder::class,
            PpeSeeder::class,
            LostTimeInjurySeeder::class,
            LeaveTypeSeeder::class,
            LeaveBalanceSeeder::class,
            IncidentReportSeeder::class,
            OnboardingSeeder::class,          // Make sure this exists
            OnboardingStatusHistorySeeder::class,
            ExchangeRateSeeder::class,
        ]);
    }
}
