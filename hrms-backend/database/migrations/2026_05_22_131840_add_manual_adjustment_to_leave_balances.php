<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddManualAdjustmentToLeaveBalances extends Migration
{
    public function up()
    {
        Schema::table('leave_balances', function (Blueprint $table) {
            if (!Schema::hasColumn('leave_balances', 'manual_adjustment')) {
                $table->decimal('manual_adjustment', 10, 2)->default(0)->after('replacement_days');
                $table->text('adjustment_reason')->nullable()->after('manual_adjustment');
                $table->unsignedBigInteger('adjusted_by')->nullable()->after('adjustment_reason');
                $table->timestamp('adjusted_at')->nullable()->after('adjusted_by');

                $table->foreign('adjusted_by')->references('id')->on('employees');
            }
        });
    }

    public function down()
    {
        Schema::table('leave_balances', function (Blueprint $table) {
            if (Schema::hasColumn('leave_balances', 'manual_adjustment')) {
                $table->dropForeign(['adjusted_by']);
                $table->dropColumn(['manual_adjustment', 'adjustment_reason', 'adjusted_by', 'adjusted_at']);
            }
        });
    }
}
