<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateReplacementLeavesTable extends Migration
{
    public function up()
    {
        Schema::create('replacement_leaves', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id');
            $table->date('work_date');
            $table->enum('work_day_type', ['weekend', 'public_holiday'])->default('weekend');
            $table->integer('hours_worked')->default(8);
            $table->date('replacement_date');
            $table->text('reason')->nullable();
            $table->decimal('days_to_add', 5, 2)->default(0);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->string('request_number', 50)->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('approved_by')->references('id')->on('employees')->onDelete('set null');
            $table->index(['employee_id', 'status']);
            $table->index('work_date');
            $table->index('replacement_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('replacement_leaves');
    }
}
