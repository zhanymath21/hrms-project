<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PPECategory;  // Changed from PpeCategory
use App\Models\PPEItem;      // Changed from PpeItem
use App\Models\PPEHistory;   // Changed from PpeHistory
use App\Models\Employee;
use Carbon\Carbon;
use Faker\Factory as Faker;

class PpeSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('📝 Creating PPE data...');

        // Create Categories if not exists
        $this->createCategories();

        // Get employees for assignment
        $employees = Employee::all();

        // Create PPE Items
        $this->createPpeItems($employees);

        // Create PPE Histories
        $this->createPpeHistories();

        $this->displaySummary();
    }

    private function createCategories()
    {
        $categories = [
            ['name' => 'Head Protection', 'code' => 'HEAD', 'description' => 'Protects head from impact and injuries'],
            ['name' => 'Eye & Face Protection', 'code' => 'EYE', 'description' => 'Protects eyes and face from hazards'],
            ['name' => 'Hearing Protection', 'code' => 'EAR', 'description' => 'Protects hearing from loud noises'],
            ['name' => 'Respiratory Protection', 'code' => 'RESP', 'description' => 'Protects respiratory system from harmful substances'],
            ['name' => 'Hand Protection', 'code' => 'HAND', 'description' => 'Protects hands from cuts, burns, and chemicals'],
            ['name' => 'Foot Protection', 'code' => 'FOOT', 'description' => 'Protects feet from falling objects and punctures'],
            ['name' => 'Body Protection', 'code' => 'BODY', 'description' => 'Protects body from hazards'],
            ['name' => 'Fall Protection', 'code' => 'FALL', 'description' => 'Prevents falls from heights'],
            ['name' => 'High Visibility', 'code' => 'HIVIS', 'description' => 'Ensures worker visibility in hazardous areas'],
            ['name' => 'Chemical Protection', 'code' => 'CHEM', 'description' => 'Protects from chemical exposure'],
            ['name' => 'Electrical Protection', 'code' => 'ELEC', 'description' => 'Protects from electrical hazards'],
            ['name' => 'Thermal Protection', 'code' => 'THERM', 'description' => 'Protects from extreme temperatures'],
        ];

        foreach ($categories as $category) {
            PPECategory::updateOrCreate(  // Changed from PpeCategory
                ['code' => $category['code']],
                $category
            );
        }

        $this->command->info('✅ ' . PPECategory::count() . ' PPE categories created');
    }

    private function createPpeItems($employees)
    {
        $this->command->info('📦 Creating PPE items...');

        // Create 100 PPE items with different statuses
        // Available items (40%)
        for ($i = 0; $i < 40; $i++) {
            $this->createPpeItem('available', null);
        }

        // Assigned items (35%)
        for ($i = 0; $i < 35; $i++) {
            $employee = $employees->random();
            $this->createPpeItem('assigned', $employee);
        }

        // Maintenance items (10%)
        for ($i = 0; $i < 10; $i++) {
            $this->createPpeItem('maintenance', null);
        }

        // Write-off items (15%)
        for ($i = 0; $i < 15; $i++) {
            $this->createPpeItem('write_off', null);
        }

        // Create specific PPE items
        $this->createSpecificPpeItems($employees);

        $this->command->info('✅ ' . PPEItem::count() . ' PPE items created');
    }

    private function createPpeItem($status, $employee = null)
    {
        $faker = Faker::create();
        $category = PPECategory::inRandomOrder()->first();  // Changed from PpeCategory

        if (!$category) {
            return null;
        }

        $itemData = [
            'name' => $this->generatePpeName($category),
            'code' => $this->generatePpeCode($category),
            'category_id' => $category->id,
            'size' => $faker->randomElement(['S', 'M', 'L', 'XL', 'XXL', 'One Size']),
            'color' => $faker->safeColorName,
            'material' => $faker->randomElement(['Polyester', 'Cotton', 'Leather', 'Rubber', 'PVC', 'Nylon']),
            'manufacturer' => $faker->company,
            'model' => $faker->bothify('Model-####'),
            'serial_number' => $faker->unique()->bothify('SN-########'),
            'location' => $faker->randomElement([
                'Warehouse A',
                'Warehouse B',
                'Main Office',
                'Factory Floor',
                'Safety Room',
                'Storage Room 1'
            ]),
            'price' => $faker->numberBetween(10000, 5000000),
            'purchase_date' => $faker->dateTimeBetween('-3 years', 'now'),
            'supplier' => $faker->company,
            'description' => $faker->paragraph,
            'certification' => $faker->randomElement(['ISO 9001', 'CE Certified', 'ANSI Z87.1']),
            'certification_date' => $faker->dateTimeBetween('-2 years', 'now'),
            'expiry_date' => $faker->dateTimeBetween('+1 month', '+5 years'),
            'condition' => $faker->randomElement(['good', 'fair', 'poor']),
            'created_by' => Employee::inRandomOrder()->first()?->id,
        ];

        if ($status === 'assigned' && $employee) {
            $assignedAt = $faker->dateTimeBetween('-6 months', 'now');
            $itemData['status'] = 'assigned';
            $itemData['current_holder_id'] = $employee->id;
            $itemData['current_holder_name'] = $employee->first_name . ' ' . $employee->last_name;
            $itemData['current_holder_department'] = $employee->department?->name;
            $itemData['current_holder_position'] = $employee->position?->name;
            $itemData['assigned_at'] = $assignedAt;
            $itemData['expected_return_date'] = $faker->dateTimeBetween($assignedAt, '+6 months');
        } elseif ($status === 'write_off') {
            $itemData['status'] = 'write_off';
            $itemData['write_off_date'] = $faker->dateTimeBetween('-6 months', 'now');
            $itemData['write_off_by'] = Employee::inRandomOrder()->first()?->id;
            $itemData['write_off_reason'] = $faker->randomElement([
                'expired',
                'damaged',
                'lost',
                'stolen',
                'obsolete'
            ]);
            $itemData['write_off_approval_number'] = $faker->bothify('WO-######');
        } elseif ($status === 'maintenance') {
            $itemData['status'] = 'maintenance';
            $itemData['condition'] = 'fair';
        } else {
            $itemData['status'] = 'available';
        }

        return PPEItem::create($itemData);  // Changed from PpeItem
    }

    private function createSpecificPpeItems($employees)
    {
        $specificItems = [
            [
                'name' => 'Safety Helmet Pro',
                'category' => 'HEAD',
                'status' => 'available',
                'manufacturer' => '3M',
                'model' => 'H-700',
                'price' => 350000,
                'certification' => 'ANSI Z89.1',
            ],
            [
                'name' => 'Chemical Resistant Gloves',
                'category' => 'HAND',
                'status' => 'assigned',
                'manufacturer' => 'Ansell',
                'model' => 'GL-200',
                'price' => 250000,
                'certification' => 'EN 374',
            ],
            [
                'name' => 'Safety Boots Steel Toe',
                'category' => 'FOOT',
                'status' => 'available',
                'manufacturer' => 'Caterpillar',
                'model' => 'SB-100',
                'price' => 450000,
                'certification' => 'EN 345',
            ],
            [
                'name' => 'Full Body Harness',
                'category' => 'FALL',
                'status' => 'maintenance',
                'manufacturer' => 'Petzl',
                'model' => 'FB-500',
                'price' => 800000,
                'certification' => 'EN 361',
            ],
            [
                'name' => 'High Vis Vest Class 3',
                'category' => 'HIVIS',
                'status' => 'available',
                'manufacturer' => 'Portwest',
                'model' => 'HV-300',
                'price' => 150000,
                'certification' => 'ANSI/ISEA 107',
            ],
        ];

        foreach ($specificItems as $itemData) {
            $category = PPECategory::where('code', $itemData['category'])->first();  // Changed from PpeCategory
            if (!$category) continue;

            $item = PPEItem::updateOrCreate(  // Changed from PpeItem
                [
                    'name' => $itemData['name'],
                    'category_id' => $category->id,
                ],
                [
                    'code' => $this->generatePpeCode($category),
                    'size' => 'M',
                    'color' => 'Yellow',
                    'material' => 'Various',
                    'manufacturer' => $itemData['manufacturer'],
                    'model' => $itemData['model'],
                    'price' => $itemData['price'],
                    'certification' => $itemData['certification'],
                    'status' => $itemData['status'],
                    'condition' => 'good',
                ]
            );

            // If assigned, assign to a random employee
            if ($itemData['status'] === 'assigned') {
                $employee = $employees->random();
                $item->update([
                    'current_holder_id' => $employee->id,
                    'current_holder_name' => $employee->first_name . ' ' . $employee->last_name,
                    'current_holder_department' => $employee->department?->name,
                    'current_holder_position' => $employee->position?->name,
                    'assigned_at' => now(),
                    'expected_return_date' => now()->addMonths(6),
                ]);
            }
        }
    }

    private function createPpeHistories()
    {
        $this->command->info('📜 Creating PPE histories...');

        $ppeItems = PPEItem::all();  // Changed from PpeItem
        $historyCount = 0;

        foreach ($ppeItems as $item) {
            // Create 1-3 history entries per item
            $numHistories = rand(1, 3);

            for ($i = 0; $i < $numHistories; $i++) {
                $actionType = $this->getRandomActionType($item->status);
                $employee = Employee::inRandomOrder()->first();

                PPEHistory::create([  // Changed from PpeHistory
                    'ppe_item_id' => $item->id,
                    'action_type' => $actionType,
                    'old_data' => null,
                    'new_data' => null,
                    'description' => $this->getActionDescription($actionType, $item),
                    'notes' => $this->getActionNotes($actionType),
                    'performed_by' => $employee?->id,
                    'performed_by_name' => $employee ? $employee->first_name . ' ' . $employee->last_name : null,
                    'created_at' => $item->created_at->addDays(rand(1, 30)),
                ]);

                $historyCount++;
            }
        }

        $this->command->info('✅ ' . $historyCount . ' PPE history records created');
    }

    private function getRandomActionType($status)
    {
        $actions = ['created', 'updated', 'condition_change'];

        if ($status === 'assigned') {
            $actions[] = 'assigned';
            $actions[] = 'returned';
        }

        if ($status === 'maintenance') {
            $actions[] = 'maintenance';
        }

        if ($status === 'write_off') {
            $actions[] = 'write_off';
        }

        return $actions[array_rand($actions)];
    }

    private function getActionDescription($actionType, $item)
    {
        $descriptions = [
            'created' => "PPE item '{$item->name}' was created in the system",
            'updated' => "PPE item '{$item->name}' information was updated",
            'assigned' => "PPE item '{$item->name}' was assigned to employee",
            'returned' => "PPE item '{$item->name}' was returned",
            'moved' => "PPE item '{$item->name}' was moved to a new location",
            'maintenance' => "PPE item '{$item->name}' was sent for maintenance",
            'write_off' => "PPE item '{$item->name}' was written off",
            'condition_change' => "Condition of '{$item->name}' was updated",
        ];

        return $descriptions[$actionType] ?? "Action performed on '{$item->name}'";
    }

    private function getActionNotes($actionType)
    {
        $notes = [
            'created' => ['New PPE added to inventory', 'Initial registration', 'Item registered in system'],
            'updated' => ['Information corrected', 'Details updated', 'Record updated'],
            'assigned' => ['Assigned for project use', 'Temporary assignment', 'Long-term assignment'],
            'returned' => ['Returned in good condition', 'Returned for maintenance', 'Returned - project completed'],
            'moved' => ['Moved to new location', 'Relocated to warehouse', 'Transferred to department'],
            'maintenance' => ['Scheduled maintenance', 'Repair required', 'Cleaning and inspection'],
            'write_off' => ['Approved for write-off', 'Disposed properly', 'Removed from inventory'],
            'condition_change' => ['Condition updated after inspection', 'Condition changed', 'Status updated'],
        ];

        $actionNotes = $notes[$actionType] ?? ['No additional notes'];
        return $actionNotes[array_rand($actionNotes)];
    }

    private function generatePpeName($category)
    {
        $names = [
            'Head Protection' => ['Safety Helmet', 'Hard Hat', 'Bump Cap'],
            'Eye & Face Protection' => ['Safety Goggles', 'Face Shield', 'Safety Glasses'],
            'Hearing Protection' => ['Ear Plugs', 'Ear Muffs'],
            'Respiratory Protection' => ['N95 Mask', 'Respirator', 'Dust Mask'],
            'Hand Protection' => ['Safety Gloves', 'Chemical Gloves', 'Cut-Resistant Gloves'],
            'Foot Protection' => ['Safety Boots', 'Steel Toe Shoes'],
            'Body Protection' => ['Safety Vest', 'Coverall', 'Apron'],
            'Fall Protection' => ['Safety Harness', 'Lanyard'],
            'High Visibility' => ['High Vis Vest', 'Reflective Jacket'],
            'Chemical Protection' => ['Chemical Suit', 'Chemical Gloves'],
            'Electrical Protection' => ['Insulating Gloves', 'Safety Boots'],
            'Thermal Protection' => ['Heat Resistant Suit', 'Welding Apron'],
        ];

        $categoryName = $category->name;
        $nameOptions = $names[$categoryName] ?? ['Safety Equipment'];

        return $nameOptions[array_rand($nameOptions)];
    }

    private function generatePpeCode($category)
    {
        $faker = Faker::create();
        $number = $faker->unique()->numberBetween(1, 9999);
        return $category->code . '-' . str_pad($number, 4, '0', STR_PAD_LEFT);
    }

    private function displaySummary()
    {
        $stats = [
            'Total PPE Items' => PPEItem::count(),  // Changed from PpeItem
            'Available' => PPEItem::where('status', 'available')->count(),
            'Assigned' => PPEItem::where('status', 'assigned')->count(),
            'Maintenance' => PPEItem::where('status', 'maintenance')->count(),
            'Write Off' => PPEItem::where('status', 'write_off')->count(),
            'History Records' => PPEHistory::count(),  // Changed from PpeHistory
        ];

        $this->command->info("\n📊 PPE Summary:");
        foreach ($stats as $key => $value) {
            $this->command->info("   • {$key}: {$value}");
        }

        // Show category breakdown
        $this->command->info("\n📂 By Category:");
        $categories = PPECategory::withCount('items')->get();  // Changed from PpeCategory
        foreach ($categories as $category) {
            $this->command->info("   • {$category->name}: {$category->items_count} items");
        }
    }
}
