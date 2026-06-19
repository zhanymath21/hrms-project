<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('candidate_id')->constrained()->onDelete('cascade');
            $table->foreignId('vacancy_id')->constrained()->onDelete('cascade');
            $table->enum('status', ['new', 'screening', 'interview', 'technical_test', 'hr_interview', 'offer', 'hired', 'rejected', 'withdrawn'])->default('pending');
            $table->text('notes')->nullable();
            $table->date('interview_date')->nullable();
            $table->text('interview_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['candidate_id', 'vacancy_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('applications');
    }
};
