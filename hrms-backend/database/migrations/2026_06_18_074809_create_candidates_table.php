<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('candidates', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('position_applied')->nullable();
            $table->integer('experience_years')->nullable();
            $table->decimal('current_salary', 15, 2)->nullable();
            $table->decimal('expected_salary', 15, 2)->nullable();
            $table->string('location')->nullable();

            // REMOVED ->change() - this is for ALTER TABLE, not CREATE TABLE
            $table->string('status', 50)->default('new');

            $table->text('notes')->nullable();

            // CV fields
            $table->string('cv_file_name')->nullable();
            $table->string('cv_file_path')->nullable();
            $table->string('cv_file_type')->nullable();
            $table->bigInteger('cv_file_size')->nullable();
            $table->string('cv_url')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('candidates');
    }
};
