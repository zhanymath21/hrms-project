<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. Work Schedules (Shift Templates)
        if (!Schema::hasTable('work_schedules')) {
            Schema::create('work_schedules', function (Blueprint $table) {
                $table->id();
                $table->string('name'); // Morning Shift, Night Shift, etc.
                $table->string('code')->unique(); // SHIFT-PAGI, SHIFT-MALAM
                $table->time('start_time');
                $table->time('end_time');
                $table->time('break_start_time')->nullable();
                $table->time('break_end_time')->nullable();
                $table->integer('break_duration_minutes')->default(60);
                $table->integer('total_working_hours')->default(8);
                $table->json('working_days')->nullable(); // [1,2,3,4,5] Mon-Fri
                $table->boolean('is_overnight')->default(false); // Shift malam
                $table->boolean('is_active')->default(true);
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }

        // 2. Employee Schedules (Assign shift to employee)
        if (!Schema::hasTable('employee_schedules')) {
            Schema::create('employee_schedules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
                $table->foreignId('work_schedule_id')->constrained('work_schedules')->onDelete('cascade');
                $table->date('start_date');
                $table->date('end_date')->nullable();
                $table->boolean('is_active')->default(true);
                $table->text('notes')->nullable();
                $table->timestamps();

                // Index untuk pencarian cepat
                $table->index(['employee_id', 'is_active']);
                $table->index(['start_date', 'end_date']);
            });
        }

        // 3. Attendances (Daily attendance record)
        if (!Schema::hasTable('attendances')) {
            Schema::create('attendances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
                $table->date('date');
                $table->enum('status', ['present', 'absent', 'late', 'half_day', 'holiday', 'weekend', 'sick', 'permission'])->default('absent');
                $table->decimal('total_hours', 5, 2)->default(0);
                $table->decimal('overtime_hours', 5, 2)->default(0);
                $table->integer('total_sessions')->default(0); // Jumlah session hari ini
                $table->time('first_check_in')->nullable(); // Check-in pertama
                $table->time('last_check_out')->nullable(); // Check-out terakhir
                $table->boolean('is_approved')->default(false);
                $table->foreignId('approved_by')->nullable()->constrained('employees')->onDelete('set null');
                $table->text('remarks')->nullable();
                $table->timestamps();

                // Unique constraint: satu employee satu attendance per hari
                $table->unique(['employee_id', 'date']);

                // Index untuk laporan
                $table->index(['date', 'status']);
                $table->index(['employee_id', 'date', 'status']);
            });
        }

        // 4. Attendance Sessions (Multiple check-in/out per day)
        if (!Schema::hasTable('attendance_sessions')) {
            Schema::create('attendance_sessions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('attendance_id')->constrained('attendances')->onDelete('cascade');
                $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
                $table->foreignId('work_schedule_id')->nullable()->constrained('work_schedules')->onDelete('set null');
                $table->date('date');
                $table->integer('session_number'); // 1, 2, 3, 4
                $table->time('check_in_time');
                $table->time('check_out_time')->nullable();
                $table->decimal('session_hours', 5, 2)->default(0);
                $table->time('schedule_start_time')->nullable(); // Jam mulai sesuai shift
                $table->time('schedule_end_time')->nullable(); // Jam selesai sesuai shift
                $table->boolean('is_late')->default(false);
                $table->integer('late_minutes')->default(0);
                $table->boolean('is_early_leave')->default(false);
                $table->integer('early_leave_minutes')->default(0);
                $table->string('check_in_location')->nullable();
                $table->string('check_out_location')->nullable();
                $table->string('check_in_ip')->nullable();
                $table->string('check_out_ip')->nullable();
                $table->enum('status', ['ongoing', 'completed', 'cancelled'])->default('ongoing');
                $table->text('notes')->nullable();
                $table->timestamps();

                // Index
                $table->index(['employee_id', 'date']);
                $table->index(['attendance_id', 'session_number']);
                $table->index(['status', 'date']);
            });
        }

        // 5. Holidays
        if (!Schema::hasTable('holidays')) {
            Schema::create('holidays', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->date('date');
                $table->text('description')->nullable();
                $table->boolean('is_recurring')->default(false); // Libur tahunan
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique(['date', 'is_recurring']);
            });
        }
    }

    public function down()
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('attendance_sessions');
        Schema::dropIfExists('holidays');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('employee_schedules');
        Schema::dropIfExists('work_schedules');
        Schema::enableForeignKeyConstraints();
    }
};
