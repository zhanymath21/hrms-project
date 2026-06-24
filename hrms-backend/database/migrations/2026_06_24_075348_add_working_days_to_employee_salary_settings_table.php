<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('employee_salary_settings', function (Blueprint $table) {
            // ✅ Working days settings
            $table->integer('working_days_per_month')->default(22)->after('currency');
            $table->enum('working_days_type', ['standard', 'shift', 'flexible'])->default('standard')->after('working_days_per_month');
            $table->boolean('include_weekends')->default(false)->after('working_days_type');
        });
    }

    public function down()
    {
        Schema::table('employee_salary_settings', function (Blueprint $table) {
            $table->dropColumn(['working_days_per_month', 'working_days_type', 'include_weekends']);
        });
    }
};
