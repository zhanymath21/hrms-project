<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('onboardings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained()->onDelete('cascade');
            $table->foreignId('employee_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('vacancy_id')->nullable()->constrained()->onDelete('set null');

            $table->string('position_title');
            $table->date('start_date');
            $table->date('expected_end_date')->nullable();
            $table->date('actual_end_date')->nullable();

            $table->string('status')->default('pending');
            $table->integer('progress')->default(0);

            $table->text('notes')->nullable();
            $table->text('tasks')->nullable(); // JSON or text

            $table->foreignId('created_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('employees')->onDelete('set null');

            $table->timestamps();
            $table->softDeletes();

            $table->index('candidate_id');
            $table->index('employee_id');
            $table->index('status');
            $table->index('start_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('onboardings');
    }
};
