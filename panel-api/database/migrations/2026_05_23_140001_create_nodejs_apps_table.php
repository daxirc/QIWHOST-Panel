<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nodejs_apps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hosting_account_id')->constrained()->onDelete('cascade');
            $table->foreignId('domain_id')->constrained()->onDelete('cascade');
            $table->string('name', 50);
            $table->string('node_version', 10);
            $table->integer('port');
            $table->string('startup_file');
            $table->enum('environment', ['development', 'production'])->default('production');
            $table->enum('status', ['stopped', 'running', 'error'])->default('stopped');
            $table->string('git_repo')->nullable();
            $table->string('git_branch')->default('main');
            $table->string('pm2_name');
            $table->boolean('auto_restart')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nodejs_apps');
    }
};
