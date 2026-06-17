<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Categories
        Schema::create('ppe_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        DB::table('ppe_categories')->insert([
            ['name' => 'Head Protection', 'code' => 'HEAD', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Eye & Face Protection', 'code' => 'EYE', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Hearing Protection', 'code' => 'EAR', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Respiratory Protection', 'code' => 'RESP', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Hand Protection', 'code' => 'HAND', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Foot Protection', 'code' => 'FOOT', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Body Protection', 'code' => 'BODY', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Fall Protection', 'code' => 'FALL', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'High Visibility', 'code' => 'HIVIS', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // PPE Items
        Schema::create('ppe_items', function (Blueprint $table) {
            $table->id();

            // Basic Info
            $table->string('name');
            $table->string('code')->unique();
            $table->foreignId('category_id')->constrained('ppe_categories')->onDelete('restrict');

            // Specification
            $table->string('size')->nullable();
            $table->string('color')->nullable();
            $table->string('material')->nullable();
            $table->string('manufacturer')->nullable();
            $table->string('model')->nullable();
            $table->string('serial_number')->nullable()->unique();

            // Location
            $table->string('location')->nullable();

            // Current Holder (Employee)
            $table->foreignId('current_holder_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->string('current_holder_name')->nullable();
            $table->string('current_holder_department')->nullable();
            $table->string('current_holder_position')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('expected_return_date')->nullable();

            // Purchase Info
            $table->decimal('price', 15, 2)->nullable();
            $table->date('purchase_date')->nullable();
            $table->string('supplier')->nullable();
            $table->string('invoice_number')->nullable();

            // Certification & Safety
            $table->text('description')->nullable();
            $table->text('specifications')->nullable();
            $table->string('certification')->nullable();
            $table->date('certification_date')->nullable();
            $table->date('expiry_date')->nullable();

            // Media
            $table->string('photo')->nullable();
            $table->string('manual_file')->nullable();
            $table->string('sds_file')->nullable();

            // Status & Condition
            $table->enum('status', ['available', 'assigned', 'maintenance', 'write_off'])->default('available');
            $table->enum('condition', ['good', 'fair', 'poor', 'damaged', 'expired'])->default('good');

            // Write-Off
            $table->timestamp('write_off_date')->nullable();
            $table->foreignId('write_off_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('write_off_reason', [
                'expired',
                'damaged',
                'lost',
                'stolen',
                'obsolete',
                'recalled',
                'replaced',
                'other'
            ])->nullable();
            $table->text('write_off_notes')->nullable();
            $table->string('write_off_approval_number')->nullable();

            // Audit Trail (✅ UBAH KE EMPLOYEES)
            $table->foreignId('created_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->foreignId('deleted_by')->nullable()->constrained('employees')->onDelete('set null');

            $table->timestamps();
            $table->softDeletes();
        });

        // History
        Schema::create('ppe_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ppe_item_id')->constrained('ppe_items')->onDelete('cascade');
            $table->enum('action_type', [
                'created',
                'updated',
                'assigned',
                'returned',
                'moved',
                'maintenance',
                'write_off',
                'condition_change'
            ]);
            $table->json('old_data')->nullable();
            $table->json('new_data')->nullable();
            $table->text('description')->nullable();
            $table->string('notes')->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->string('performed_by_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ppe_histories');
        Schema::dropIfExists('ppe_items');
        Schema::dropIfExists('ppe_categories');
    }
};
