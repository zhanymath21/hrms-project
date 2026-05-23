<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Add photo to attendance_sessions
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->string('check_in_photo')->nullable();
            $table->string('check_out_photo')->nullable();
            $table->string('card_id')->nullable(); // Kartu akses
            $table->string('check_in_method')->default('mobile'); // mobile, card, web, manual
            $table->string('check_out_method')->default('mobile');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
        });

        // Add card to employees
        Schema::table('employees', function (Blueprint $table) {
            $table->string('card_number')->nullable()->unique();
            $table->string('card_type')->nullable(); // RFID, NFC, Barcode, QR
            $table->boolean('use_card')->default(false);
        });

        // Location/Office settings
        Schema::create('office_locations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->integer('radius_meters')->default(100); // Geofence radius
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'check_in_photo',
                'check_out_photo',
                'card_id',
                'check_in_method',
                'check_out_method',
                'latitude',
                'longitude'
            ]);
        });
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['card_number', 'card_type', 'use_card']);
        });
        Schema::dropIfExists('office_locations');
    }
};