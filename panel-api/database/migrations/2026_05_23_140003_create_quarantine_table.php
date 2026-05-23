<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quarantine', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hosting_account_id')->constrained()->onDelete('cascade');
            $table->string('original_path');
            $table->string('quarantine_path');
            $table->string('threat_type');
            $table->boolean('reviewed')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quarantine');
    }
};
