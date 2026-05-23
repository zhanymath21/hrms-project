<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employee_office_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('office_location_id')->constrained()->onDelete('cascade');
            $table->boolean('is_primary')->default(false);
            $table->boolean('is_active')->default(true);
            $table->date('assigned_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Unique constraint: satu employee hanya bisa punya satu primary office
            $table->unique(['employee_id', 'office_location_id']);
        });

        // Tambah kolom default_office_location_id ke employees
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'default_office_id')) {
                $table->foreignId('default_office_id')
                    ->nullable()
                    ->after('position_id')
                    ->constrained('office_locations')
                    ->nullOnDelete();
            }
        });
    }

    public function down()
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['default_office_id']);
            $table->dropColumn('default_office_id');
        });
        Schema::dropIfExists('employee_office_locations');
    }
};
