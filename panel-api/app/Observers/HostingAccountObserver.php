<?php

namespace App\Observers;

use App\Models\HostingAccount;

class HostingAccountObserver
{
    /**
     * Handle the HostingAccount "created" event.
     */
    public function created(HostingAccount $hostingAccount): void
    {
        //
    }

    /**
     * Handle the HostingAccount "updated" event.
     */
    public function updated(HostingAccount $hostingAccount): void
    {
        //
    }

    /**
     * Handle the HostingAccount "deleted" event.
     */
    public function deleted(HostingAccount $hostingAccount): void
    {
        //
    }

    /**
     * Handle the HostingAccount "restored" event.
     */
    public function restored(HostingAccount $hostingAccount): void
    {
        //
    }

    /**
     * Handle the HostingAccount "force deleted" event.
     */
    public function forceDeleted(HostingAccount $hostingAccount): void
    {
        //
    }
}
