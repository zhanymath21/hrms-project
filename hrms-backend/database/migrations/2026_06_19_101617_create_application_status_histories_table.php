<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('application_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained()->onDelete('cascade');
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->text('notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->timestamps();

            $table->index('application_id');
            $table->index('updated_by');
        });
    }

    public function down()
    {
        Schema::dropIfExists('application_status_histories');
    }
};
