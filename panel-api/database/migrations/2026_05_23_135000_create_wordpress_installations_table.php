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
        Schema::create('wordpress_installations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hosting_account_id')->index();
            $table->unsignedBigInteger('domain_id')->index();
            $table->string('path');
            $table->string('version')->default('6.5');
            $table->string('db_name');
            $table->string('db_user');
            $table->string('status')->default('active'); // active/updating/maintenance
            $table->string('wp_admin_user');
            $table->string('wp_admin_email');
            $table->boolean('auto_update')->default(true);
            $table->timestamp('installed_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wordpress_installations');
    }
};
