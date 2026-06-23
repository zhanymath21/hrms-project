<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ExchangeRate;
use Carbon\Carbon;

class ExchangeRateSeeder extends Seeder
{
    public function run()
    {
        // ============================================
        // 1. USD to KHR Exchange Rates (Historical)
        // ============================================

        // Current Active Rate - USD to KHR
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4100.0000,
            'effective_date' => Carbon::now()->startOfMonth(),
            'is_active' => true,
            'notes' => 'Current active exchange rate - 1 USD = 4,100 KHR',
            'updated_by' => 1,
        ]);

        // USD to KHR - Previous Month Rate
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4050.0000,
            'effective_date' => Carbon::now()->subMonth()->startOfMonth(),
            'is_active' => false,
            'notes' => 'Previous month exchange rate - 1 USD = 4,050 KHR',
            'updated_by' => 1,
        ]);

        // USD to KHR - 2 Months Ago Rate
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4000.0000,
            'effective_date' => Carbon::now()->subMonths(2)->startOfMonth(),
            'is_active' => false,
            'notes' => '2 months ago exchange rate - 1 USD = 4,000 KHR',
            'updated_by' => 1,
        ]);

        // USD to KHR - 3 Months Ago Rate
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 3950.0000,
            'effective_date' => Carbon::now()->subMonths(3)->startOfMonth(),
            'is_active' => false,
            'notes' => '3 months ago exchange rate - 1 USD = 3,950 KHR',
            'updated_by' => 1,
        ]);

        // ============================================
        // 2. KHR to USD Exchange Rates (Reverse)
        // ============================================

        // Current Active Rate - KHR to USD
        ExchangeRate::create([
            'from_currency' => 'KHR',
            'to_currency' => 'USD',
            'rate' => 0.0002439, // 1 / 4100
            'effective_date' => Carbon::now()->startOfMonth(),
            'is_active' => true,
            'notes' => 'Current active exchange rate - 1 KHR = 0.0002439 USD',
            'updated_by' => 1,
        ]);

        // KHR to USD - Previous Month Rate
        ExchangeRate::create([
            'from_currency' => 'KHR',
            'to_currency' => 'USD',
            'rate' => 0.0002469, // 1 / 4050
            'effective_date' => Carbon::now()->subMonth()->startOfMonth(),
            'is_active' => false,
            'notes' => 'Previous month exchange rate - 1 KHR = 0.0002469 USD',
            'updated_by' => 1,
        ]);

        // KHR to USD - 2 Months Ago Rate
        ExchangeRate::create([
            'from_currency' => 'KHR',
            'to_currency' => 'USD',
            'rate' => 0.0002500, // 1 / 4000
            'effective_date' => Carbon::now()->subMonths(2)->startOfMonth(),
            'is_active' => false,
            'notes' => '2 months ago exchange rate - 1 KHR = 0.0002500 USD',
            'updated_by' => 1,
        ]);

        // KHR to USD - 3 Months Ago Rate
        ExchangeRate::create([
            'from_currency' => 'KHR',
            'to_currency' => 'USD',
            'rate' => 0.0002532, // 1 / 3950
            'effective_date' => Carbon::now()->subMonths(3)->startOfMonth(),
            'is_active' => false,
            'notes' => '3 months ago exchange rate - 1 KHR = 0.0002532 USD',
            'updated_by' => 1,
        ]);

        // ============================================
        // 3. USD to KHR - Historical Rates (2024)
        // ============================================

        // January 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4100.0000,
            'effective_date' => '2024-01-01',
            'is_active' => false,
            'notes' => 'January 2024 - 1 USD = 4,100 KHR',
            'updated_by' => 1,
        ]);

        // February 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4080.0000,
            'effective_date' => '2024-02-01',
            'is_active' => false,
            'notes' => 'February 2024 - 1 USD = 4,080 KHR',
            'updated_by' => 1,
        ]);

        // March 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4060.0000,
            'effective_date' => '2024-03-01',
            'is_active' => false,
            'notes' => 'March 2024 - 1 USD = 4,060 KHR',
            'updated_by' => 1,
        ]);

        // April 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4040.0000,
            'effective_date' => '2024-04-01',
            'is_active' => false,
            'notes' => 'April 2024 - 1 USD = 4,040 KHR',
            'updated_by' => 1,
        ]);

        // May 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4020.0000,
            'effective_date' => '2024-05-01',
            'is_active' => false,
            'notes' => 'May 2024 - 1 USD = 4,020 KHR',
            'updated_by' => 1,
        ]);

        // June 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4000.0000,
            'effective_date' => '2024-06-01',
            'is_active' => false,
            'notes' => 'June 2024 - 1 USD = 4,000 KHR',
            'updated_by' => 1,
        ]);

        // July 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4050.0000,
            'effective_date' => '2024-07-01',
            'is_active' => false,
            'notes' => 'July 2024 - 1 USD = 4,050 KHR',
            'updated_by' => 1,
        ]);

        // August 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4080.0000,
            'effective_date' => '2024-08-01',
            'is_active' => false,
            'notes' => 'August 2024 - 1 USD = 4,080 KHR',
            'updated_by' => 1,
        ]);

        // September 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4100.0000,
            'effective_date' => '2024-09-01',
            'is_active' => false,
            'notes' => 'September 2024 - 1 USD = 4,100 KHR',
            'updated_by' => 1,
        ]);

        // October 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4120.0000,
            'effective_date' => '2024-10-01',
            'is_active' => false,
            'notes' => 'October 2024 - 1 USD = 4,120 KHR',
            'updated_by' => 1,
        ]);

        // November 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4150.0000,
            'effective_date' => '2024-11-01',
            'is_active' => false,
            'notes' => 'November 2024 - 1 USD = 4,150 KHR',
            'updated_by' => 1,
        ]);

        // December 2024
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4100.0000,
            'effective_date' => '2024-12-01',
            'is_active' => false,
            'notes' => 'December 2024 - 1 USD = 4,100 KHR',
            'updated_by' => 1,
        ]);

        // ============================================
        // 4. USD to KHR - 2025 Rates (Future)
        // ============================================

        // January 2025
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4080.0000,
            'effective_date' => '2025-01-01',
            'is_active' => false,
            'notes' => 'January 2025 - 1 USD = 4,080 KHR (Projected)',
            'updated_by' => 1,
        ]);

        // February 2025
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4050.0000,
            'effective_date' => '2025-02-01',
            'is_active' => false,
            'notes' => 'February 2025 - 1 USD = 4,050 KHR (Projected)',
            'updated_by' => 1,
        ]);

        // March 2025
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4020.0000,
            'effective_date' => '2025-03-01',
            'is_active' => false,
            'notes' => 'March 2025 - 1 USD = 4,020 KHR (Projected)',
            'updated_by' => 1,
        ]);

        // ============================================
        // 5. Special Exchange Rates (For Testing)
        // ============================================

        // Test Rate - Different Rate
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 4200.0000,
            'effective_date' => Carbon::now()->addDays(1),
            'is_active' => false,
            'notes' => 'Test rate for future date - 1 USD = 4,200 KHR',
            'updated_by' => 1,
        ]);

        // Test Rate - Different Rate 2
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'KHR',
            'rate' => 3800.0000,
            'effective_date' => Carbon::now()->subYear(),
            'is_active' => false,
            'notes' => 'Historical test rate - 1 USD = 3,800 KHR',
            'updated_by' => 1,
        ]);

        // ============================================
        // 6. USD to Other Currencies (Optional)
        // ============================================

        // USD to THB (Thai Baht) - For reference
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'THB',
            'rate' => 35.0000,
            'effective_date' => Carbon::now()->startOfMonth(),
            'is_active' => false,
            'notes' => 'Reference rate - 1 USD = 35 THB',
            'updated_by' => 1,
        ]);

        // USD to VND (Vietnamese Dong) - For reference
        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'VND',
            'rate' => 24500.0000,
            'effective_date' => Carbon::now()->startOfMonth(),
            'is_active' => false,
            'notes' => 'Reference rate - 1 USD = 24,500 VND',
            'updated_by' => 1,
        ]);

        // ============================================
        // 7. Additional Currency Pair (USD to EUR)
        // ============================================

        ExchangeRate::create([
            'from_currency' => 'USD',
            'to_currency' => 'EUR',
            'rate' => 0.9200,
            'effective_date' => Carbon::now()->startOfMonth(),
            'is_active' => false,
            'notes' => 'Reference rate - 1 USD = 0.92 EUR',
            'updated_by' => 1,
        ]);

        $this->command->info('✅ Exchange rates seeded successfully!');
        $this->command->info('📊 Total exchange rates: ' . ExchangeRate::count());
    }
}
