<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            // ✅ Manual adjustment fields
            $table->boolean('is_manual_adjusted')->default(false);
            $table->decimal('manual_adjustment_amount', 15, 2)->default(0);
            $table->text('manual_adjustment_reason')->nullable();
            $table->timestamp('manual_adjusted_at')->nullable();
            $table->foreignId('manual_adjusted_by')->nullable()->constrained('employees')->onDelete('set null');

            // ✅ Override attendance fields
            $table->integer('override_present_days')->nullable();
            $table->integer('override_absent_days')->nullable();
            $table->integer('override_leave_days')->nullable();
            $table->text('override_notes')->nullable();
        });
    }

    public function down()
    {
        Schema::table('payroll_items', function (Blueprint $table) {
            $table->dropColumn([
                'is_manual_adjusted',
                'manual_adjustment_amount',
                'manual_adjustment_reason',
                'manual_adjusted_at',
                'manual_adjusted_by',
                'override_present_days',
                'override_absent_days',
                'override_leave_days',
                'override_notes',
            ]);
        });
    }
};
