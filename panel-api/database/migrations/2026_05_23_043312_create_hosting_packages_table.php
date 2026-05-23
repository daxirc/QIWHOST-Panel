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
        Schema::create('hosting_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('disk_space')->nullable(); // in MB
            $table->integer('bandwidth')->nullable(); // in GB
            $table->integer('databases')->nullable();
            $table->integer('ftp_accounts')->nullable();
            $table->integer('email_accounts')->nullable();
            $table->integer('subdomains')->nullable();
            $table->integer('parked_domains')->nullable();
            $table->integer('addon_domains')->nullable();
            $table->integer('ssl_certificates')->nullable();
            $table->integer('daily_backups')->nullable();
            $table->boolean('free_domain')->default(false);
            $table->decimal('price', 8, 2)->default(0.00);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hosting_packages');
    }
};
