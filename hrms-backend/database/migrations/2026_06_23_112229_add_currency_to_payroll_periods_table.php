<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('payroll_periods', function (Blueprint $table) {
            // ✅ Set default 'KHR' dan allow null
            $table->string('currency', 3)->default('KHR')->after('notes');
        });
    }

    public function down()
    {
        Schema::table('payroll_periods', function (Blueprint $table) {
            $table->dropColumn('currency');
        });
    }
};
