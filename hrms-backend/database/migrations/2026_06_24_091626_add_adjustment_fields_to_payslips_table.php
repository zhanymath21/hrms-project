<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('payslips', function (Blueprint $table) {
            // ✅ Adjustment fields
            $table->decimal('adjustment_amount', 15, 2)->default(0)->after('total_deductions');
            $table->text('adjustment_reason')->nullable()->after('adjustment_amount');
            $table->boolean('is_adjusted')->default(false)->after('adjustment_reason');
        });
    }

    public function down()
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn(['adjustment_amount', 'adjustment_reason', 'is_adjusted']);
        });
    }
};
