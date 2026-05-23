<?php
// database/migrations/2024_01_01_000002_add_probation_to_employees_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddProbationToEmployeesTable extends Migration
{
    public function up()
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->date('probation_end_date')->nullable()->after('hire_date');
            $table->enum('employment_status', ['probation', 'permanent', 'contract'])
                ->default('probation')
                ->after('status');
        });
    }

    public function down()
    {
        Schema::disableForeignKeyConstraints();
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['probation_end_date', 'employment_status']);
        });
        Schema::enableForeignKeyConstraints();
    }
}
