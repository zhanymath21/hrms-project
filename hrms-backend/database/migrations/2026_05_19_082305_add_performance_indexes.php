<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Index untuk employees
        Schema::table('employees', function (Blueprint $table) {
            $table->index(['status', 'department_id']);
            $table->index('manager_id');
            $table->index('email');
        });

        // Index untuk attendances
        Schema::table('attendances', function (Blueprint $table) {
            $table->index(['employee_id', 'date']);
            $table->index('date');
            $table->index('status');
        });

        // Index untuk attendance_sessions
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->index(['attendance_id', 'status']);
            $table->index('employee_id');
        });
    }

    public function down()
    {
        // Drop indexes
    }
};
