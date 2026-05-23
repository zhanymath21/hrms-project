<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateLeaveBalancesTable extends Migration
{
    public function up()
    {
        Schema::create('leave_balances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('leave_type_id');
            $table->integer('year');

            // Entitlements
            $table->decimal('base_entitlement', 10, 2)->default(0);      // 18, 12, or 7
            $table->decimal('seniority_bonus', 10, 2)->default(0);        // +1 or +2 for AL
            $table->decimal('carry_forward', 10, 2)->default(0);           // max 6 for AL
            $table->decimal('replacement_days', 10, 2)->default(0);        // from holiday work

            // Total = base + seniority + carry_forward + replacement
            $table->decimal('total_entitlement', 10, 2)->default(0);

            // Usage
            $table->decimal('used_days', 10, 2)->default(0);
            $table->decimal('pending_days', 10, 2)->default(0);
            $table->decimal('remaining_days', 10, 2)->default(0);

            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('leave_type_id')->references('id')->on('leave_types')->onDelete('cascade');
            $table->unique(['employee_id', 'leave_type_id', 'year']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('leave_balances');
    }
}
