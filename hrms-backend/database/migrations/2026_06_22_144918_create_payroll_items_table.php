<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::dropIfExists('payroll_items');

        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_period_id')->constrained()->onDelete('cascade');
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');

            // Basic Salary
            $table->decimal('basic_salary', 15, 2)->default(0);
            $table->decimal('allowance', 15, 2)->default(0);
            $table->decimal('overtime', 15, 2)->default(0);
            $table->decimal('bonus', 15, 2)->default(0);
            $table->decimal('commission', 15, 2)->default(0);
            $table->decimal('other_earnings', 15, 2)->default(0);
            $table->decimal('total_earnings', 15, 2)->default(0);

            // Deductions
            $table->decimal('tax', 15, 2)->default(0);
            $table->decimal('social_security', 15, 2)->default(0);
            $table->decimal('health_insurance', 15, 2)->default(0);
            $table->decimal('loan', 15, 2)->default(0);
            $table->decimal('advance', 15, 2)->default(0);
            $table->decimal('other_deductions', 15, 2)->default(0);
            $table->decimal('total_deductions', 15, 2)->default(0);

            // Net Pay
            $table->decimal('net_pay', 15, 2)->default(0);

            // Working Days
            $table->integer('working_days')->default(0);
            $table->integer('present_days')->default(0);
            $table->integer('absent_days')->default(0);
            $table->integer('leave_days')->default(0);
            $table->integer('holiday_days')->default(0);
            $table->integer('overtime_hours')->default(0);

            // Currency
            $table->string('currency', 3)->default('KHR');
            $table->decimal('exchange_rate', 10, 2)->default(1);

            // ✅ Prorata fields
            $table->boolean('is_prorated')->default(false);
            $table->integer('prorated_days')->default(0);
            $table->decimal('actual_salary', 15, 2)->default(0);

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['payroll_period_id', 'employee_id']);
            $table->index('employee_id');
            $table->index('payroll_period_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('payroll_items');
    }
};
