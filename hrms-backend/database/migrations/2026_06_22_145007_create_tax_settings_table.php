<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('tax_settings', function (Blueprint $table) {
            $table->id();
            $table->year('year');
            $table->json('tax_brackets'); // Tax brackets for Cambodia
            $table->decimal('personal_relief', 15, 2)->default(0);
            $table->decimal('dependent_relief', 15, 2)->default(0);
            $table->decimal('nssf_employee_rate', 5, 2)->default(2.5); // NSSF employee contribution
            $table->decimal('nssf_employer_rate', 5, 2)->default(2.5); // NSSF employer contribution
            $table->json('social_security_brackets')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['year', 'is_active']);
            $table->index('year');
        });
    }

    public function down()
    {
        Schema::dropIfExists('tax_settings');
    }
};
