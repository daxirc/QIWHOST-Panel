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
        Schema::create('email_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hosting_account_id')->constrained('hosting_accounts')->onDelete('cascade');
            $table->string('username')->unique();
            $table->string('password');
            $table->string('name')->nullable();
            $table->bigInteger('quota')->nullable(); // in MB
            $table->string('local_part')->nullable();
            $table->string('domain')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('smtp_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_accounts');
    }
};
