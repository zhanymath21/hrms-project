<?php
// database/migrations/xxxx_xx_xx_create_leave_tables.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Leave Types
        Schema::create('leave_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('days_per_year', 5, 1)->default(12);
            $table->boolean('is_paid')->default(true);
            $table->boolean('allow_carry_forward')->default(true);
            $table->decimal('max_carry_forward_days', 5, 1)->default(6);
            $table->boolean('is_active')->default(true);
            $table->boolean('require_attachment')->default(false);
            $table->timestamps();
        });

        // 2. Leave Balances
        Schema::create('leave_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('leave_type_id')->constrained()->onDelete('cascade');
            $table->integer('year');
            $table->decimal('base_entitlement', 5, 1)->default(0);
            $table->decimal('seniority_bonus', 5, 1)->default(0);
            $table->decimal('carry_forward', 5, 1)->default(0);
            $table->decimal('replacement_days', 5, 1)->default(0);
            $table->decimal('manual_adjustment', 5, 1)->default(0);
            $table->decimal('total_entitlement', 5, 1)->default(0);
            $table->decimal('used_days', 5, 1)->default(0);
            $table->decimal('pending_days', 5, 1)->default(0);
            $table->decimal('remaining_days', 5, 1)->default(0);
            $table->text('adjustment_reason')->nullable();
            $table->foreignId('adjusted_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->timestamp('adjusted_at')->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'leave_type_id', 'year']);
        });

        // 3. Leave Requests
        Schema::create('leaves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('leave_type_id')->constrained()->onDelete('cascade');
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('total_days', 5, 1);
            $table->text('reason')->nullable();
            $table->string('attachment')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->integer('approval_level')->default(0);
            $table->integer('total_approval_levels')->default(1);
            $table->text('rejection_reason')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 4. Leave Approvals
        Schema::create('leave_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('leave_id')->constrained()->onDelete('cascade');
            $table->foreignId('approver_id')->constrained('employees')->onDelete('cascade');
            $table->integer('level');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['leave_id', 'approver_id']);
        });

        // 5. Leave Approval Flows
        Schema::create('leave_approval_flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('position_id')->nullable()->constrained()->onDelete('cascade');
            $table->integer('level');
            $table->string('approver_type');
            $table->foreignId('approver_id')->nullable()->constrained('employees')->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 6. Leave History
        Schema::create('leave_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('leave_id')->constrained()->onDelete('cascade');
            $table->foreignId('performed_by')->constrained('employees')->onDelete('cascade');
            $table->string('action');
            $table->integer('level')->nullable();
            $table->text('notes')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->timestamps();
        });

        // 7. Replacement Leaves
        Schema::create('replacement_leaves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('work_date');
            $table->enum('work_day_type', ['weekend', 'public_holiday'])->default('weekend');
            $table->integer('hours_worked')->default(8);
            $table->date('replacement_date');
            $table->decimal('days_to_add', 3, 1)->default(1);
            $table->text('reason')->nullable();
            $table->string('attachment')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->integer('approval_level')->default(0);
            $table->integer('total_approval_levels')->default(1);
            $table->text('rejection_reason')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 8. Replacement Approvals
        Schema::create('replacement_leave_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('replacement_leave_id')->constrained('replacement_leaves')->onDelete('cascade');
            $table->foreignId('approver_id')->constrained('employees')->onDelete('cascade');
            $table->integer('level');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['replacement_leave_id', 'approver_id']);
        });

        // 9. Replacement Approval Flows
        Schema::create('replacement_approval_flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('position_id')->nullable()->constrained()->onDelete('cascade');
            $table->integer('level');
            $table->string('approver_type');
            $table->foreignId('approver_id')->nullable()->constrained('employees')->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 10. Replacement History
        Schema::create('replacement_leave_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('replacement_leave_id')->constrained('replacement_leaves')->onDelete('cascade');
            $table->foreignId('performed_by')->constrained('employees')->onDelete('cascade');
            $table->string('action');
            $table->integer('level')->nullable();
            $table->text('notes')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('replacement_leave_audit_logs');
        Schema::dropIfExists('replacement_approval_flows');
        Schema::dropIfExists('replacement_leave_approvals');
        Schema::dropIfExists('replacement_leaves');
        Schema::dropIfExists('leave_audit_logs');
        Schema::dropIfExists('leave_approval_flows');
        Schema::dropIfExists('leave_approvals');
        Schema::dropIfExists('leaves');
        Schema::dropIfExists('leave_balances');
        Schema::dropIfExists('leave_types');
    }
};