<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('vacancies', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->text('description')->nullable();
            $table->text('requirements')->nullable();
            $table->string('location')->nullable();
            $table->decimal('salary_min', 15, 2)->nullable();
            $table->decimal('salary_max', 15, 2)->nullable();
            $table->enum('status', ['open', 'closed', 'on_hold'])->default('open');
            $table->integer('applicants_count')->default(0);
            $table->date('posted_date')->nullable();
            $table->date('closing_date')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('vacancies');
    }
};
