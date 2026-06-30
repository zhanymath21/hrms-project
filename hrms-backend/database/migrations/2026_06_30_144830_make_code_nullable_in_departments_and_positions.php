<?php
// database/migrations/xxxx_xx_xx_make_code_nullable_in_departments_and_positions.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Ubah department code menjadi nullable
        Schema::table('departments', function (Blueprint $table) {
            $table->string('code')->nullable()->change();
        });

        // Ubah position code menjadi nullable
        Schema::table('positions', function (Blueprint $table) {
            $table->string('code')->nullable()->change();
        });

        // Update existing data dengan code yang unik
        $departments = DB::table('departments')->whereNull('code')->get();
        foreach ($departments as $department) {
            $code = 'DEPT-' . str_pad($department->id, 3, '0', STR_PAD_LEFT);
            DB::table('departments')
                ->where('id', $department->id)
                ->update(['code' => $code]);
        }

        $positions = DB::table('positions')->whereNull('code')->get();
        foreach ($positions as $position) {
            $code = 'POS-' . str_pad($position->id, 4, '0', STR_PAD_LEFT);
            DB::table('positions')
                ->where('id', $position->id)
                ->update(['code' => $code]);
        }
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->string('code')->nullable(false)->change();
        });

        Schema::table('positions', function (Blueprint $table) {
            $table->string('code')->nullable(false)->change();
        });
    }
};
