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
        Schema::create('ssl_certificates', function (Blueprint $table) {
            $table->id();
            $table->string('domain');
            $table->string('provider')->default('letsencrypt');
            $table->foreignId('hosting_account_id')->constrained('hosting_accounts')->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_wildcard')->default(false);
            $table->boolean('is_auto_renew')->default(true);
            $table->timestamp('expiration_date')->nullable();
            $table->longText('certificate')->nullable();
            $table->longText('private_key')->nullable();
            $table->longText('certificate_chain')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ssl_certificates');
    }
};
