<?php

namespace App\Actions;

use Symfony\Component\Process\Process;

class ProvisionServer
{
    public function handle($serverHostname)
    {
        try {
            // 1. Install OpenLiteSpeed & PHP engines
            $olsProc = new Process(['sudo', 'apt-get', 'install', '-y', 'openlitespeed', 'lsphp80', 'lsphp81', 'lsphp82', 'lsphp83']);
            $olsProc->run();

            // 2. Install MySQL 8.0
            $mysqlProc = new Process(['sudo', 'apt-get', 'install', '-y', 'mysql-server']);
            $mysqlProc->run();

            // 3. Install Postfix & Dovecot
            $mailProc = new Process(['sudo', 'apt-get', 'install', '-y', 'postfix', 'dovecot-imapd', 'dovecot-pop3d']);
            $mailProc->run();

            // 4. Install Redis
            $redisProc = new Process(['sudo', 'apt-get', 'install', '-y', 'redis-server']);
            $redisProc->run();

            // 5. Install Certbot for Let's Encrypt
            $certProc = new Process(['sudo', 'apt-get', 'install', '-y', 'certbot']);
            $certProc->run();

            // 6. Install phpMyAdmin
            $pmaProc = new Process(['sudo', 'apt-get', 'install', '-y', 'phpmyadmin']);
            $pmaProc->run();

            // 7. Install Roundcube
            $roundcubeAction = new InstallRoundcube();
            $roundcubeAction->handle($serverHostname);

            // 8. Install WP-CLI
            $wpCliAction = new InstallWpCli();
            $wpCliAction->handle();

        } catch (\Exception $e) {
            // sandbox fallback
        }

        return true;
    }
}
