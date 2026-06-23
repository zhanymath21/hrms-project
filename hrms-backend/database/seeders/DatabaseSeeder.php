<?php

namespace Database\Seeders;

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
            // ============================================
            // 1. MASTER DATA (Harus dijalankan pertama)
            // ============================================

            // Department & Position
            DepartmentSeeder::class,
            PositionSeeder::class,

            // Employees
            AdminEmployeeSeeder::class,    // Admin/HR users
            EmployeeSeeder::class,          // Regular employees

            // ============================================
            // 2. HR / RECRUITMENT
            // ============================================

            // Recruitment
            VacancySeeder::class,
            CandidateSeeder::class,         // ✅ Tambahkan jika ada
            // ApplicationSeeder::class,       // ✅ Tambahkan jika ada

            // Onboarding
            OnboardingSeeder::class,
            OnboardingStatusHistorySeeder::class,

            // ============================================
            // 3. PAYROLL & SALARY
            // ============================================

            // Payroll Settings
            TaxSettingsSeeder::class,       // Tax brackets untuk Kamboja
            ExchangeRateSeeder::class,       // USD ↔ KHR rates
            // EmployeeSalarySettingSeeder::class, // ✅ Tambahkan ini

            // Payroll Data
            PayrollPeriodSeeder::class,
            PayrollItemSeeder::class,
            // PayslipSeeder::class,            // ✅ Tambahkan jika ada

            // ============================================
            // 4. ATTENDANCE & SCHEDULE
            // ============================================

            WorkScheduleSeeder::class,
            LeaveTypeSeeder::class,
            LeaveBalanceSeeder::class,

            // ============================================
            // 5. SAFETY & INCIDENT
            // ============================================

            // PPE
            PpeSeeder::class,
            // PpeCategorySeeder::class,        // ✅ Tambahkan jika ada

            // Incident & Safety
            IncidentReportSeeder::class,
            // IncidentStatusHistorySeeder::class, // ✅ Tambahkan jika ada
            LostTimeInjurySeeder::class,
            // LostTimeInjuryHistorySeeder::class, // ✅ Tambahkan jika ada

            // ============================================
            // 6. OTHER
            // ============================================

            // Notifications & Settings
            // NotificationSeeder::class,       // ✅ Tambahkan jika ada
            // SystemSettingsSeeder::class,     // ✅ Tambahkan jika ada
        ]);
    }
}
