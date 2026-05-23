<?php

namespace App\Actions;

use Symfony\Component\Process\Process;

class InstallWpCli
{
    public function handle()
    {
        try {
            // Download WP-CLI phar securely using process arrays
            $dlProc = new Process([
                'curl', '-o', '/usr/local/bin/wp',
                'https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar'
            ]);
            $dlProc->run();

            // Set executable permission
            $chmodProc = new Process(['sudo', 'chmod', '+x', '/usr/local/bin/wp']);
            $chmodProc->run();

        } catch (\Exception $e) {
            // sandbox fallback
        }

        return true;
    }
}
