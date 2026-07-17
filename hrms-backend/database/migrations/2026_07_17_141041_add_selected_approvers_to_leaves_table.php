<?php
// database/migrations/2026_07_17_add_selected_approvers_to_leaves.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leaves', function (Blueprint $table) {
            $table->json('selected_approvers')->nullable()->after('approval_flow');
            $table->boolean('is_employee_selected')->default(false)->after('selected_approvers');
        });

        Schema::table('leave_approvals', function (Blueprint $table) {
            $table->boolean('is_selected')->default(false)->after('level');
        });
    }

    public function down(): void
    {
        Schema::table('leaves', function (Blueprint $table) {
            $table->dropColumn(['selected_approvers', 'is_employee_selected']);
        });

        Schema::table('leave_approvals', function (Blueprint $table) {
            $table->dropColumn('is_selected');
        });
    }
};