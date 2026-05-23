<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateLeaveTypesTable extends Migration
{
    public function up()
    {
        Schema::create('leave_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique(); // AL, SL, SPL
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->decimal('days_per_year', 10, 2)->default(0);
            $table->boolean('is_paid')->default(true);
            $table->boolean('allow_carry_forward')->default(false);
            $table->integer('max_carry_forward_days')->default(6);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('leave_types');
    }
}
