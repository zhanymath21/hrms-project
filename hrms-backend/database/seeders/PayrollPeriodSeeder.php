<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PayrollPeriod;
use Carbon\Carbon;

class PayrollPeriodSeeder extends Seeder
{
    public function run()
    {
        $payrollPeriods = [];

        // Current month - First half (1-15)
        $currentMonth = Carbon::now()->format('Y-m');
        $startDate1 = Carbon::createFromFormat('Y-m', $currentMonth)->startOfMonth();
        $endDate1 = Carbon::createFromFormat('Y-m', $currentMonth)->startOfMonth()->addDays(14);

        $payroll1 = PayrollPeriod::updateOrCreate(
            [
                'start_date' => $startDate1->format('Y-m-d'),
                'end_date' => $endDate1->format('Y-m-d'),
                'payroll_type' => 'semi_monthly',
            ],
            [
                'name' => $startDate1->format('F Y') . ' - First Half',
                'start_date' => $startDate1->format('Y-m-d'),
                'end_date' => $endDate1->format('Y-m-d'),
                'payment_date' => $endDate1->copy()->addDays(5)->format('Y-m-d'),
                'payroll_type' => 'semi_monthly',
                'payroll_cycle' => 'first',
                'cycle_number' => 1,
                'status' => 'draft',
                'notes' => 'First half payroll for ' . $startDate1->format('F Y'),
                'created_by' => 1,
            ]
        );
        $payrollPeriods[] = $payroll1;

        // Current month - Second half (16-end)
        $startDate2 = Carbon::createFromFormat('Y-m', $currentMonth)->startOfMonth()->addDays(15);
        $endDate2 = Carbon::createFromFormat('Y-m', $currentMonth)->endOfMonth();

        $payroll2 = PayrollPeriod::updateOrCreate(
            [
                'start_date' => $startDate2->format('Y-m-d'),
                'end_date' => $endDate2->format('Y-m-d'),
                'payroll_type' => 'semi_monthly',
            ],
            [
                'name' => $startDate2->format('F Y') . ' - Second Half',
                'start_date' => $startDate2->format('Y-m-d'),
                'end_date' => $endDate2->format('Y-m-d'),
                'payment_date' => $endDate2->copy()->addDays(5)->format('Y-m-d'),
                'payroll_type' => 'semi_monthly',
                'payroll_cycle' => 'second',
                'cycle_number' => 2,
                'status' => 'draft',
                'notes' => 'Second half payroll for ' . $startDate2->format('F Y'),
                'created_by' => 1,
            ]
        );
        $payrollPeriods[] = $payroll2;

        // Previous month - Full month (for monthly payroll type)
        $previousMonth = Carbon::now()->subMonth()->format('Y-m');
        $startDate3 = Carbon::createFromFormat('Y-m', $previousMonth)->startOfMonth();
        $endDate3 = Carbon::createFromFormat('Y-m', $previousMonth)->endOfMonth();

        $payroll3 = PayrollPeriod::updateOrCreate(
            [
                'start_date' => $startDate3->format('Y-m-d'),
                'end_date' => $endDate3->format('Y-m-d'),
                'payroll_type' => 'monthly',
            ],
            [
                'name' => $startDate3->format('F Y') . ' - Monthly',
                'start_date' => $startDate3->format('Y-m-d'),
                'end_date' => $endDate3->format('Y-m-d'),
                'payment_date' => $endDate3->copy()->addDays(10)->format('Y-m-d'),
                'payroll_type' => 'monthly',
                'payroll_cycle' => 'first',
                'cycle_number' => 1,
                'status' => 'paid',
                'notes' => 'Monthly payroll for ' . $startDate3->format('F Y'),
                'created_by' => 1,
                'approved_by' => 1,
                'approved_at' => Carbon::now()->subDays(5),
            ]
        );
        $payrollPeriods[] = $payroll3;

        $this->command->info('✅ ' . count($payrollPeriods) . ' payroll periods created');

        return $payrollPeriods;
    }
}
