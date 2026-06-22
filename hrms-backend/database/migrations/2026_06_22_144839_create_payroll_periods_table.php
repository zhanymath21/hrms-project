<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date');
            $table->date('payment_date')->nullable();

            // ✅ Tambahan untuk multiple payroll per bulan
            $table->enum('payroll_type', ['monthly', 'semi_monthly', 'weekly'])->default('semi_monthly');
            $table->enum('payroll_cycle', ['first', 'second', 'third', 'fourth'])->default('first');
            $table->integer('cycle_number')->nullable(); // 1 = first half, 2 = second half

            $table->enum('status', ['draft', 'processing', 'approved', 'paid', 'cancelled'])->default('draft');
            $table->decimal('total_gross', 15, 2)->default(0);
            $table->decimal('total_deductions', 15, 2)->default(0);
            $table->decimal('total_net', 15, 2)->default(0);
            $table->decimal('total_tax', 15, 2)->default(0);
            $table->integer('total_employees')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('start_date');
            $table->index('end_date');
            $table->index('payroll_type');
            $table->index('payroll_cycle');
            $table->unique(['start_date', 'end_date', 'payroll_type']); // Prevent duplicate
        });
    }

    public function down()
    {
        Schema::dropIfExists('payroll_periods');
    }
};
