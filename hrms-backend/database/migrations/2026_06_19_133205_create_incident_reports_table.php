<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // ============ INCIDENT REPORTS TABLE ============
        Schema::create('incident_reports', function (Blueprint $table) {
            $table->id();

            // Foreign Keys
            $table->foreignId('reported_by')->constrained('employees')->onDelete('cascade');
            $table->foreignId('assigned_to')->nullable()->constrained('employees')->onDelete('set null');
            $table->foreignId('created_by')->nullable()->constrained('employees')->onDelete('set null');

            // Basic Information
            $table->string('title');
            $table->text('description');
            $table->string('location')->nullable();
            $table->date('incident_date');
            $table->time('incident_time')->nullable();

            // Category
            $table->enum('category', [
                'safety',
                'security',
                'health',
                'property_damage',
                'environmental',
                'harassment',
                'discrimination',
                'fraud',
                'theft',
                'data_breach',
                'policy_violation',
                'workplace_violence',
                'accident',
                'near_miss',
                'other'
            ])->default('other');

            // Severity
            $table->enum('severity', [
                'low',
                'medium',
                'high',
                'critical'
            ])->default('low');

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
            $table->index('category');
            $table->index('status');
            $table->index('approval_status');
            $table->index('incident_date');
            $table->index('reported_by');
            $table->index('assigned_to');
            $table->index('created_by');
            $table->index('manager1_id');
            $table->index('manager2_id');
            $table->index('manager3_id');
            $table->index('manager4_id');
        });

        // ============ INCIDENT STATUS HISTORIES TABLE ============
        Schema::create('incident_status_histories', function (Blueprint $table) {
            $table->id();

            // Foreign Key
            $table->foreignId('incident_report_id')->constrained('incident_reports')->onDelete('cascade');

            // Status Changes
            $table->string('old_status')->nullable();
            $table->string('new_status');

            // Approval Status Changes
            $table->string('old_approval_status')->nullable();
            $table->string('new_approval_status')->nullable();

            // Notes
            $table->text('notes')->nullable();

            // Who made the change
            $table->foreignId('updated_by')->nullable()->constrained('employees')->onDelete('set null');

            // Timestamps
            $table->timestamps();

            // Indexes
            $table->index('incident_report_id');
            $table->index('updated_by');
            $table->index('new_status');
            $table->index('new_approval_status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('incident_status_histories');
        Schema::dropIfExists('incident_reports');
    }
};
