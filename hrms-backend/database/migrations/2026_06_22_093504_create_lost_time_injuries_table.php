<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('lost_time_injuries', function (Blueprint $table) {
            $table->id();

            // Foreign Keys
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->foreignId('reported_by')->constrained('employees')->onDelete('cascade');
            $table->foreignId('created_by')->nullable()->constrained('employees')->onDelete('set null');

            // Basic Information
            $table->string('title');
            $table->text('description');
            $table->string('location')->nullable();
            $table->date('injury_date');
            $table->time('injury_time')->nullable();

            // Injury Details
            $table->string('body_part')->nullable(); // Body part affected
            $table->string('injury_type')->nullable(); // Type of injury
            $table->string('severity')->nullable(); // Minor, Moderate, Severe, Critical

            // Medical Information
            $table->boolean('medical_treatment')->default(false);
            $table->date('return_to_work_date')->nullable();
            $table->integer('days_lost')->default(0);
            $table->text('medical_notes')->nullable();

            // Status
            $table->enum('status', [
                'reported',
                'under_investigation',
                'in_review',
                'resolved',
                'closed',
                'rejected'
            ])->default('reported');

            // Resolution
            $table->text('resolution_notes')->nullable();
            $table->date('resolved_date')->nullable();

            // Files
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();

            // Witnesses (JSON)
            $table->json('witnesses')->nullable();

            // Approval Flow
            $table->json('approval_flow')->nullable();

            // Manager 1
            $table->foreignId('manager1_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('manager1_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('manager1_approved_at')->nullable();
            $table->text('manager1_notes')->nullable();

            // Manager 2
            $table->foreignId('manager2_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('manager2_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('manager2_approved_at')->nullable();
            $table->text('manager2_notes')->nullable();

            // Manager 3
            $table->foreignId('manager3_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('manager3_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('manager3_approved_at')->nullable();
            $table->text('manager3_notes')->nullable();

            // Manager 4
            $table->foreignId('manager4_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('manager4_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('manager4_approved_at')->nullable();
            $table->text('manager4_notes')->nullable();

            // Overall Approval Status
            $table->enum('approval_status', [
                'pending',
                'in_progress',
                'approved',
                'rejected',
                'partially_approved'
            ])->default('pending');

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('status');
            $table->index('approval_status');
            $table->index('injury_date');
            $table->index('employee_id');
            $table->index('reported_by');
            $table->index('created_by');
            $table->index('manager1_id');
            $table->index('manager2_id');
            $table->index('manager3_id');
            $table->index('manager4_id');
        });

        // ============ LOST TIME INJURY STATUS HISTORIES TABLE ============
        Schema::create('lost_time_injury_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lost_time_injury_id')->constrained('lost_time_injuries')->onDelete('cascade');
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->string('old_approval_status')->nullable();
            $table->string('new_approval_status')->nullable();
            $table->integer('old_days_lost')->nullable();
            $table->integer('new_days_lost')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->timestamps();

            $table->index('lost_time_injury_id');
            $table->index('updated_by');
            $table->index('new_status');
            $table->index('new_approval_status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('lost_time_injury_histories');
        Schema::dropIfExists('lost_time_injuries');
    }
};
