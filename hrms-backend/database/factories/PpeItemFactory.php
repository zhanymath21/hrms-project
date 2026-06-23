<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\PpeCategory;
use App\Models\PpeItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class PpeItemFactory extends Factory
{
    protected $model = PpeItem::class;

    public function definition()
    {
        $statuses = ['available', 'assigned', 'maintenance', 'write_off'];
        $status = $this->faker->randomElement($statuses);

        $conditions = ['good', 'fair', 'poor', 'damaged', 'expired'];
        $condition = $this->faker->randomElement($conditions);

        $category = PpeCategory::inRandomOrder()->first();
        $employee = Employee::inRandomOrder()->first();

        $isAssigned = $status === 'assigned';
        $assignedAt = $isAssigned ? $this->faker->dateTimeBetween('-1 year', 'now') : null;
        $expectedReturnDate = $assignedAt ? $this->faker->dateTimeBetween($assignedAt, '+6 months') : null;

        $isWriteOff = $status === 'write_off';
        $writeOffDate = $isWriteOff ? $this->faker->dateTimeBetween('-6 months', 'now') : null;
        $writeOffReasons = ['expired', 'damaged', 'lost', 'stolen', 'obsolete', 'recalled', 'replaced', 'other'];
        $writeOffReason = $isWriteOff ? $this->faker->randomElement($writeOffReasons) : null;

        return [
            'name' => $this->generatePpeName($category),
            'code' => $this->generatePpeCode($category),
            'category_id' => $category?->id ?? PpeCategory::factory(),

            // Specification
            'size' => $this->faker->optional(0.7)->randomElement(['S', 'M', 'L', 'XL', 'XXL', 'One Size']),
            'color' => $this->faker->optional(0.6)->safeColorName,
            'material' => $this->faker->optional(0.5)->randomElement(['Polyester', 'Cotton', 'Leather', 'Rubber', 'PVC', 'Nylon', 'Kevlar', 'Steel']),
            'manufacturer' => $this->faker->optional(0.7)->company,
            'model' => $this->faker->optional(0.5)->bothify('Model-####'),
            'serial_number' => $this->faker->optional(0.3)->unique()->bothify('SN-########'),

            // Location
            'location' => $this->faker->optional(0.8)->randomElement([
                'Warehouse A',
                'Warehouse B',
                'Main Office',
                'Factory Floor',
                'Safety Room',
                'Storage Room 1',
                'Storage Room 2',
                'Vehicle',
                'Site Office'
            ]),

            // Current Holder
            'current_holder_id' => $isAssigned ? $employee?->id : null,
            'current_holder_name' => $isAssigned ? ($employee?->first_name . ' ' . $employee?->last_name) : null,
            'current_holder_department' => $isAssigned ? $employee?->department?->name : null,
            'current_holder_position' => $isAssigned ? $employee?->position?->name : null,
            'assigned_at' => $assignedAt,
            'expected_return_date' => $expectedReturnDate,

            // Purchase Info
            'price' => $this->faker->optional(0.8)->numberBetween(10000, 5000000),
            'purchase_date' => $this->faker->optional(0.7)->dateTimeBetween('-3 years', 'now'),
            'supplier' => $this->faker->optional(0.6)->company,
            'invoice_number' => $this->faker->optional(0.4)->bothify('INV-######'),

            // Certification & Safety
            'description' => $this->faker->optional(0.7)->paragraph,
            'specifications' => $this->faker->optional(0.5)->paragraphs(2, true),
            'certification' => $this->faker->optional(0.6)->randomElement([
                'ISO 9001',
                'CE Certified',
                'ANSI Z87.1',
                'EN 166',
                'EN 397',
                'EN 352',
                'EN 149',
                'EN 388',
                'EN 345',
                'EN 471'
            ]),
            'certification_date' => $this->faker->optional(0.5)->dateTimeBetween('-2 years', 'now'),
            'expiry_date' => $this->faker->optional(0.6)->dateTimeBetween('+1 month', '+5 years'),

            // Media
            'photo' => $this->faker->optional(0.3)->imageUrl(200, 200, 'tech'),
            'manual_file' => $this->faker->optional(0.2)->filePath(),
            'sds_file' => $this->faker->optional(0.2)->filePath(),

            // Status & Condition
            'status' => $status,
            'condition' => $condition,

            // Write-Off
            'write_off_date' => $writeOffDate,
            'write_off_by' => $isWriteOff ? Employee::inRandomOrder()->first()?->id : null,
            'write_off_reason' => $writeOffReason,
            'write_off_notes' => $isWriteOff ? $this->faker->optional(0.7)->sentence : null,
            'write_off_approval_number' => $isWriteOff ? $this->faker->optional(0.5)->bothify('WO-######') : null,

            // Audit Trail
            'created_by' => Employee::inRandomOrder()->first()?->id,
            'updated_by' => Employee::inRandomOrder()->first()?->id,

            'created_at' => $this->faker->dateTimeBetween('-2 years', 'now'),
            'updated_at' => function (array $attributes) {
                return $attributes['created_at'];
            },
        ];
    }

    private function generatePpeName($category)
    {
        $names = [
            'Head Protection' => ['Safety Helmet', 'Hard Hat', 'Bump Cap', 'Headguard'],
            'Eye & Face Protection' => ['Safety Goggles', 'Face Shield', 'Safety Glasses', 'Welding Shield'],
            'Hearing Protection' => ['Ear Plugs', 'Ear Muffs', 'Band Earplugs'],
            'Respiratory Protection' => ['N95 Mask', 'Respirator', 'Dust Mask', 'Gas Mask'],
            'Hand Protection' => ['Safety Gloves', 'Chemical Gloves', 'Cut-Resistant Gloves', 'Heat-Resistant Gloves'],
            'Foot Protection' => ['Safety Boots', 'Steel Toe Shoes', 'Safety Shoes'],
            'Body Protection' => ['Safety Vest', 'Coverall', 'Apron', 'Body Suit'],
            'Fall Protection' => ['Safety Harness', 'Lanyard', 'Safety Belt'],
            'High Visibility' => ['High Vis Vest', 'Reflective Jacket', 'Safety Vest'],
            'Chemical Protection' => ['Chemical Suit', 'Chemical Gloves', 'Goggles'],
            'Electrical Protection' => ['Insulating Gloves', 'Insulating Mat', 'Safety Boots'],
            'Thermal Protection' => ['Heat Resistant Suit', 'Fire Resistant Clothing', 'Welding Apron'],
        ];

        $categoryName = $category?->name ?? 'General';
        $nameOptions = $names[$categoryName] ?? ['Safety Equipment', 'Protective Gear', 'Safety Item'];

        return $this->faker->randomElement($nameOptions);
    }

    private function generatePpeCode($category)
    {
        $categoryCode = $category?->code ?? 'PPE';
        $number = $this->faker->unique()->numberBetween(1, 9999);
        return $categoryCode . '-' . str_pad($number, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Indicate that the PPE is available.
     */
    public function available()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'available',
                'current_holder_id' => null,
                'current_holder_name' => null,
                'current_holder_department' => null,
                'current_holder_position' => null,
                'assigned_at' => null,
                'expected_return_date' => null,
                'write_off_date' => null,
                'write_off_by' => null,
                'write_off_reason' => null,
            ];
        });
    }

    /**
     * Indicate that the PPE is assigned.
     */
    public function assigned()
    {
        return $this->state(function (array $attributes) {
            $employee = Employee::inRandomOrder()->first();
            return [
                'status' => 'assigned',
                'current_holder_id' => $employee?->id,
                'current_holder_name' => $employee ? $employee->first_name . ' ' . $employee->last_name : null,
                'current_holder_department' => $employee?->department?->name,
                'current_holder_position' => $employee?->position?->name,
                'assigned_at' => now(),
                'expected_return_date' => now()->addMonths(6),
            ];
        });
    }

    /**
     * Indicate that the PPE is in maintenance.
     */
    public function maintenance()
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'maintenance',
                'condition' => 'fair',
            ];
        });
    }

    /**
     * Indicate that the PPE is written off.
     */
    public function writeOff()
    {
        return $this->state(function (array $attributes) {
            $reasons = ['expired', 'damaged', 'lost', 'stolen', 'obsolete', 'recalled', 'replaced', 'other'];
            return [
                'status' => 'write_off',
                'write_off_date' => now(),
                'write_off_by' => Employee::inRandomOrder()->first()?->id,
                'write_off_reason' => $this->faker->randomElement($reasons),
                'write_off_approval_number' => $this->faker->bothify('WO-######'),
            ];
        });
    }
}
