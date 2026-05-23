<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hosting_account_id')->constrained()->onDelete('cascade');
            $table->string('event_type');
            $table->text('description');
            $table->string('ip_address', 45);
            $table->string('file_path')->nullable();
            $table->boolean('blocked')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_events');
    }
};
