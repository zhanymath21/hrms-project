<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employee_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('asset_type'); // Laptop, Monitor, Uniform, etc
            $table->string('asset_name');
            $table->string('serial_number')->nullable();
            $table->string('condition')->default('good'); // good, fair, poor
            $table->text('notes')->nullable();
            $table->string('status')->default('active'); // active, returned
            $table->date('assigned_date');
            $table->date('return_date')->nullable();
            $table->string('return_reason')->nullable();
            $table->string('return_condition')->nullable();
            $table->text('return_notes')->nullable();
            $table->string('replace_reason')->nullable(); // Untuk replace
            $table->unsignedBigInteger('replaced_by_asset_id')->nullable(); // Link ke asset baru
            $table->unsignedBigInteger('replacement_for_asset_id')->nullable(); // Link ke asset lama
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('employee_assets');
    }
};
