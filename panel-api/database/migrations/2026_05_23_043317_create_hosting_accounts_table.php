<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('hosting_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->foreignId('hosting_package_id')->constrained('hosting_packages')->onDelete('cascade');
            $table->string('domain')->nullable();
            $table->string('system_username')->unique();
            $table->string('system_password');
            $table->string('status')->default('active');
            $table->timestamp('setup_date')->nullable();
            $table->timestamp('expiry_date')->nullable();
            $table->timestamp('renewal_date')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hosting_accounts');
    }
};
