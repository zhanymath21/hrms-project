<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaxSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'year',
        'tax_brackets',
        'personal_relief',
        'dependent_relief',
        'nssf_employee_rate',
        'nssf_employer_rate',
        'social_security_brackets',
        'is_active',
    ];

    protected $casts = [
        'tax_brackets' => 'array',
        'social_security_brackets' => 'array',
        'personal_relief' => 'decimal:2',
        'dependent_relief' => 'decimal:2',
        'nssf_employee_rate' => 'decimal:2',
        'nssf_employer_rate' => 'decimal:2',
    ];

    // Get active tax settings for current year
    public static function getActive()
    {
        return self::where('year', date('Y'))
            ->where('is_active', true)
            ->first();
    }

    // Calculate tax based on Cambodia tax brackets
    public function calculateTax($monthlyIncome, $dependents = 0)
    {
        $taxBrackets = $this->tax_brackets;
        $personalRelief = $this->personal_relief;
        $dependentRelief = $this->dependent_relief * $dependents;

        $taxableIncome = $monthlyIncome - $personalRelief - $dependentRelief;

        if ($taxableIncome <= 0) {
            return 0;
        }

        $tax = 0;
        $remaining = $taxableIncome;

        // Sort brackets by threshold
        $brackets = collect($taxBrackets)->sortBy('threshold');

        foreach ($brackets as $bracket) {
            if ($remaining <= 0) break;

            if ($bracket['threshold'] === null || $remaining <= $bracket['threshold']) {
                $tax += $remaining * ($bracket['rate'] / 100);
                break;
            } else {
                $tax += $bracket['threshold'] * ($bracket['rate'] / 100);
                $remaining -= $bracket['threshold'];
            }
        }

        return round($tax, 2);
    }

    // Calculate NSSF contribution
    public function calculateNSSF($monthlySalary)
    {
        $employeeRate = $this->nssf_employee_rate / 100;
        $employerRate = $this->nssf_employer_rate / 100;

        // NSSF brackets - only up to certain amount
        $maxSalary = $this->social_security_brackets['max_salary'] ?? 1200000;
        $baseSalary = min($monthlySalary, $maxSalary);

        return [
            'employee' => round($baseSalary * $employeeRate, 2),
            'employer' => round($baseSalary * $employerRate, 2),
            'total' => round($baseSalary * ($employeeRate + $employerRate), 2),
        ];
    }
}
