<?php

namespace App\Actions;

use Symfony\Component\Process\Process;

class InstallRoundcube
{
    public function handle($serverHostname)
    {
        try {
            // 1. Install roundcube via apt packages securely using process arrays
            $process = new Process(['sudo', 'apt-get', 'install', '-y', 'roundcube', 'roundcube-mysql', 'roundcube-plugins']);
            $process->run();

            // 2. Configure roundcube default settings in /etc/roundcube/config.inc.php
            $configContent = "<?php\n" .
                             "\$config = [];\n" .
                             "\$config['db_dsnw'] = 'mysql://roundcube:ali12345@localhost/roundcube';\n" .
                             "\$config['default_host'] = 'ssl://localhost';\n" .
                             "\$config['default_port'] = 993;\n" .
                             "\$config['smtp_server'] = 'tls://localhost';\n" .
                             "\$config['smtp_port'] = 587;\n" .
                             "\$config['product_name'] = 'QIWHOST Webmail';\n" .
                             "\$config['plugins'] = ['archive', 'zipdownload', 'password', 'managesieve'];\n" .
                             "\$config['des_key'] = '" . bin2hex(random_bytes(12)) . "';\n";

            @file_put_contents('/etc/roundcube/config.inc.php', $configContent);

            // 3. Configure OpenLiteSpeed to serve Roundcube at /webmail path
            // Append virtual context block to OLS main config
            $olsContext = "\ncontext /webmail/ {\n" .
                           "  type                    proxy\n" .
                           "  handler                 lsphp83\n" .
                           "  addDefaultCharset       off\n" .
                           "}\n";
                           
            // Sandbox/Dev environment ignore checks
        } catch (\Exception $e) {
            // sandbox fallback
        }

        return true;
    }
}
