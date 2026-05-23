<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;
use App\Models\LeaveType;
use App\Models\LeaveBalance;
use Carbon\Carbon;

class LeaveBalanceSeeder extends Seeder
{
    public function run()
    {
        // Ambil semua employee dengan status active
        $employees = Employee::where('status', 'active')->get();

        if ($employees->isEmpty()) {
            $this->command->warn('No active employees found. Please run EmployeeSeeder first.');
            return;
        }

        $currentYear = Carbon::now()->year;

        foreach ($employees as $employee) {
            // Hitung seniority bonus berdasarkan masa kerja
            $seniorityBonus = $this->calculateSeniorityBonus($employee);

            // Ambil semua leave type yang aktif
            $leaveTypes = LeaveType::where('is_active', true)->get();

            if ($leaveTypes->isEmpty()) {
                $this->command->warn('No active leave types found. Please run LeaveTypesSeeder first.');
                return;
            }

            foreach ($leaveTypes as $leaveType) {
                $leaveBalanceData = $this->calculateLeaveBalance(
                    $employee,
                    $leaveType,
                    $currentYear,
                    $seniorityBonus
                );

                // Gunakan updateOrCreate untuk menghindari duplicate
                LeaveBalance::updateOrCreate(
                    [
                        'employee_id' => $employee->id,
                        'leave_type_id' => $leaveType->id,
                        'year' => $currentYear,
                    ],
                    $leaveBalanceData
                );
            }
        }

        $this->command->info('Leave balances seeded successfully for ' . $employees->count() . ' employees.');
    }

    /**
     * Hitung seniority bonus berdasarkan masa kerja
     */
    private function calculateSeniorityBonus($employee): array
    {
        $joinDate = Carbon::parse($employee->hire_date);
        $yearsOfService = $joinDate->diffInYears(Carbon::now());

        $annualLeaveBonus = 0;

        // Bonus untuk Annual Leave berdasarkan masa kerja
        if ($yearsOfService >= 6) {
            $annualLeaveBonus = 2;  // Bonus 2 hari untuk 6+ tahun
        } elseif ($yearsOfService >= 3) {
            $annualLeaveBonus = 1;  // Bonus 1 hari untuk 3+ tahun
        }

        return [
            'years_of_service' => $yearsOfService,
            'annual_leave_bonus' => $annualLeaveBonus,
        ];
    }

    /**
     * Hitung balance untuk setiap tipe cuti
     */
    private function calculateLeaveBalance($employee, $leaveType, $year, $seniorityBonus): array
    {
        // 1. Base entitlement dari days_per_year
        $baseEntitlement = $leaveType->days_per_year;

        // 2. Seniority bonus (khusus untuk Annual Leave)
        $seniorityBonusDays = 0;
        if ($leaveType->code === 'AL') {
            $seniorityBonusDays = $seniorityBonus['annual_leave_bonus'];
        }

        // 3. Carry forward dari tahun sebelumnya (khusus untuk Annual Leave)
        $carryForwardDays = 0;
        if ($leaveType->allow_carry_forward && $leaveType->code === 'AL') {
            $previousBalance = LeaveBalance::where('employee_id', $employee->id)
                ->where('leave_type_id', $leaveType->id)
                ->where('year', $year - 1)
                ->first();

            if ($previousBalance && $previousBalance->remaining_days > 0) {
                $unusedDays = $previousBalance->remaining_days;
                $carryForwardDays = min($unusedDays, $leaveType->max_carry_forward_days);
            }
        }

        // 4. Replacement days (default 0, bisa diupdate manual nanti)
        $replacementDays = 0;

        // 5. Total entitlement
        $totalEntitlement = $baseEntitlement + $seniorityBonusDays + $carryForwardDays + $replacementDays;

        // 6. Used & pending days (default 0 untuk seeder awal)
        $usedDays = 0;
        $pendingDays = 0;

        // 7. Remaining days
        $remainingDays = $totalEntitlement - $usedDays - $pendingDays;

        return [
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'year' => $year,
            'base_entitlement' => $baseEntitlement,
            'seniority_bonus' => $seniorityBonusDays,
            'carry_forward' => $carryForwardDays,
            'replacement_days' => $replacementDays,
            'total_entitlement' => $totalEntitlement,
            'used_days' => $usedDays,
            'pending_days' => $pendingDays,
            'remaining_days' => $remainingDays,
        ];
    }
}
