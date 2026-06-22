<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employee_salary_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');

            // Salary Components
            $table->decimal('basic_salary', 15, 2)->default(0);
            $table->decimal('housing_allowance', 15, 2)->default(0);
            $table->decimal('transport_allowance', 15, 2)->default(0);
            $table->decimal('meal_allowance', 15, 2)->default(0);
            $table->decimal('phone_allowance', 15, 2)->default(0);
            $table->decimal('other_allowance', 15, 2)->default(0);

            // Tax Settings
            $table->integer('dependents')->default(0);
            $table->boolean('is_tax_exempt')->default(false);

            // Payment Settings
            $table->enum('payment_method', ['bank_transfer', 'cash', 'check'])->default('bank_transfer');
            $table->string('bank_name')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('bank_account_name')->nullable();

            // Currency
            $table->string('currency', 3)->default('KHR');

            $table->timestamps();

            $table->unique('employee_id');
            $table->index('employee_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('employee_salary_settings');
    }
};
