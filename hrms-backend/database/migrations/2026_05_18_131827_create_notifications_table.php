<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotificationsTable extends Migration
{
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id'); // penerima notifikasi
            $table->unsignedBigInteger('from_user_id')->nullable(); // pembuat notifikasi
            $table->string('type'); // leave_request, leave_approved, leave_rejected, replacement_request, etc
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable(); // additional data
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('from_user_id')->references('id')->on('employees')->onDelete('set null');
            $table->index(['user_id', 'is_read']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('notifications');
    }
}
