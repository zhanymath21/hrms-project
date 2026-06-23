<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->string('from_currency', 3)->default('USD');
            $table->string('to_currency', 3)->default('KHR');
            $table->decimal('rate', 15, 4)->default(4100); // 1 USD = 4100 KHR
            $table->date('effective_date');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->timestamps();

            $table->unique(['from_currency', 'to_currency', 'effective_date']);
            $table->index('effective_date');
            $table->index('is_active');
        });
    }

    public function down()
    {
        Schema::dropIfExists('exchange_rates');
    }
};
