<?php

namespace App\Services;

use Symfony\Component\Process\Process;

class AccountIsolation
{
    public function setupAccountPermissions(string $username)
    {
        $homeDir = "/home/{$username}";
        $publicHtml = "{$homeDir}/public_html";

        try {
            // Set ownership
            $chown = new Process(['sudo', 'chown', '-R', "{$username}:{$username}", $homeDir]);
            $chown->run();

            // Home directory permission: traverse but do not list
            $chmodHome = new Process(['sudo', 'chmod', '711', $homeDir]);
            $chmodHome->run();

            // Web directory permission: read & execute
            $chmodWeb = new Process(['sudo', 'chmod', '755', $publicHtml]);
            $chmodWeb->run();

            // Add htaccess constraint blocking PHP executions inside uploads directories
            $htaccessContent = "<FilesMatch '\\.(php|php3|php4|php5|php7|php8|phtml|phar)$'>\n" .
                               "  Deny from all\n" .
                               "</FilesMatch>\n";
            
            $uploadsDir = "{$publicHtml}/uploads";
            if (!is_dir($uploadsDir)) {
                mkdir($uploadsDir, 0755, true);
            }
            file_put_contents("{$uploadsDir}/.htaccess", $htaccessContent);

            $chownHt = new Process(['sudo', 'chown', '-R', "{$username}:{$username}", $uploadsDir]);
            $chownHt->run();

        } catch (\Exception $e) {}
    }

    public function isPathSafe(string $username, string $path): bool
    {
        $homeDir = realpath("/home/{$username}");
        $realPath = realpath($path);

        if ($realPath === false) {
            // Canonical check if doesn't exist
            $canonical = $this->canonicalizePath($path);
            return str_starts_with($canonical, "/home/{$username}");
        }

        return str_starts_with($realPath, $homeDir);
    }

    private function canonicalizePath(string $path): string
    {
        $path = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);
        $parts = array_filter(explode(DIRECTORY_SEPARATOR, $path), 'strlen');
        $absolutes = [];
        foreach ($parts as $part) {
            if ('.' == $part) continue;
            if ('..' == $part) {
                array_pop($absolutes);
            } else {
                $absolutes[] = $part;
            }
        }
        return DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $absolutes);
    }

    public function scanAccountForThreats(string $username): array
    {
        $scanner = new SecurityScanner();
        return $scanner->scanDirectory("/home/{$username}");
    }
}
