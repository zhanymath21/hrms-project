<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\PpeHistory;
use App\Models\PpeItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class PpeHistoryFactory extends Factory
{
    protected $model = PpeHistory::class;

    public function definition()
    {
        $actionTypes = [
            'created',
            'updated',
            'assigned',
            'returned',
            'moved',
            'maintenance',
            'write_off',
            'condition_change'
        ];

        $actionType = $this->faker->randomElement($actionTypes);
        $employee = Employee::inRandomOrder()->first();

        return [
            'ppe_item_id' => PpeItem::factory(),
            'action_type' => $actionType,
            'old_data' => $this->faker->optional(0.5)->jsonObject(),
            'new_data' => $this->faker->optional(0.5)->jsonObject(),
            'description' => $this->generateActionDescription($actionType),
            'notes' => $this->faker->optional(0.4)->sentence,
            'performed_by' => $employee?->id,
            'performed_by_name' => $employee ? $employee->first_name . ' ' . $employee->last_name : null,
            'created_at' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'updated_at' => now(),
        ];
    }

    private function generateActionDescription($actionType)
    {
        $descriptions = [
            'created' => 'PPE item was created in the system',
            'updated' => 'PPE item information was updated',
            'assigned' => 'PPE was assigned to an employee',
            'returned' => 'PPE was returned from employee',
            'moved' => 'PPE was moved to a new location',
            'maintenance' => 'PPE was sent for maintenance',
            'write_off' => 'PPE was written off',
            'condition_change' => 'PPE condition status was changed',
        ];

        return $descriptions[$actionType] ?? 'Action performed on PPE item';
    }
}
