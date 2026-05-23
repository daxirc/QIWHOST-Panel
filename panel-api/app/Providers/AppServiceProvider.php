<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\HostingAccount;
use App\Observers\HostingAccountObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        HostingAccount::observe(HostingAccountObserver::class);
    }
}

