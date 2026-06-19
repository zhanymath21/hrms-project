<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('onboarding_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('onboarding_id')->constrained()->onDelete('cascade');
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->integer('old_progress')->nullable();
            $table->integer('new_progress')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->timestamps();

            $table->index('onboarding_id');
            $table->index('updated_by');
        });
    }

    public function down()
    {
        Schema::dropIfExists('onboarding_status_histories');
    }
};
