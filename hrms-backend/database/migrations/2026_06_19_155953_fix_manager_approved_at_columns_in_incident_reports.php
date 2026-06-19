<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            // Change the timestamp columns to nullable datetime
            $table->timestamp('manager1_approved_at')->nullable()->change();
            $table->timestamp('manager2_approved_at')->nullable()->change();
            $table->timestamp('manager3_approved_at')->nullable()->change();
            $table->timestamp('manager4_approved_at')->nullable()->change();
        });
    }

    public function down()
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            // Revert if needed
        });
    }
};
