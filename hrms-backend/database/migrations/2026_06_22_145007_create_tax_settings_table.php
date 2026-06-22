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

            // Tax Brackets (JSON)
            $table->json('tax_brackets');

            // Relief
            $table->decimal('personal_relief', 15, 2)->default(1500000);
            $table->decimal('dependent_relief', 15, 2)->default(150000);

            // NSSF - National Social Security Fund
            $table->decimal('nssf_employee_rate', 5, 2)->default(2.5);
            $table->decimal('nssf_employer_rate', 5, 2)->default(2.5);
            $table->json('social_security_brackets')->nullable();

            // ✅ Tambahkan minimum_wage
            $table->decimal('minimum_wage', 15, 2)->default(1000000);

            // Other Settings
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

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
