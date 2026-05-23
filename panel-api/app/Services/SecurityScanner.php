<?php

namespace App\Services;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Process\Process;

class SecurityScanner
{
    // Known malicious shell signatures
    private array $shellSignatures = [
        'eval(base64_decode',
        'eval(gzinflate',
        'eval(str_rot13',
        'eval(gzuncompress',
        'eval($_POST',
        'eval($_GET',
        'eval($_REQUEST',
        'assert($_POST',
        'assert($_GET',
        'assert($_REQUEST',
        '$_POST[\'cmd\']',
        '$_GET[\'cmd\']',
        'passthru($_',
        'shell_exec($_',
        'system($_',
        'exec($_',
        'base64_decode(gzinflate',
        'FilesMan',
        'c99shell',
        'r57shell',
        'phpspy',
        'webshell',
        'preg_replace.*\/e',
        'create_function',
        'ReflectionFunction',
        '<?php @eval',
        '<?php eval',
        '@extract($_',
        'str_replace(\'.\',\'\',',
        'gzuncompress(base64_decode',
        'stratum+tcp',
        'cryptonight',
        'minerd',
    ];

    // Dangerous file extensions
    private array $dangerousExtensions = [
        'php', 'php3', 'php4', 'php5', 'php7', 'php8', 'phtml', 'phar',
        'shtml', 'cgi', 'pl', 'py', 'sh', 'bash', 'asp', 'aspx',
        'jsp', 'jspx', 'war', 'exe', 'com', 'bat', 'cmd', 'vbs',
        'htaccess'
    ];

    public function scanFile(UploadedFile $file): array
    {
        $threats = [];

        // 1. Check extension (NOT just MIME - MIME can be faked)
        $extension = strtolower($file->getClientOriginalExtension());

        if (in_array($extension, $this->dangerousExtensions)) {
            $threats[] = "Dangerous file extension: .{$extension}";
        }

        // 2. Check for double extensions (shell.php.jpg trick)
        $originalName = $file->getClientOriginalName();
        $parts = explode('.', $originalName);
        if (count($parts) > 2) {
            foreach (array_slice($parts, 1, -1) as $part) {
                if (in_array(strtolower($part), $this->dangerousExtensions)) {
                    $threats[] = "Double extension detected: {$originalName}";
                    break;
                }
            }
        }

        // 3. Check file content for shell signatures
        $content = file_get_contents($file->getRealPath());
        foreach ($this->shellSignatures as $signature) {
            if (stripos($content, $signature) !== false) {
                $threats[] = "Malicious code pattern detected: {$signature}";
                break;
            }
        }

        // 4. Check for PHP tags in files
        if (str_contains($content, '<?php') || str_contains($content, '<?=')) {
            // Only flag if it's disguised (e.g. extension says it's an image or text file)
            $safeDocExtensions = ['html', 'htm', 'css', 'js', 'json', 'xml', 'yaml', 'yml', 'md', 'sql', 'php', 'phtml', 'phar'];
            if (!in_array($extension, $safeDocExtensions)) {
                $threats[] = "PHP execution block found disguised in .{$extension} file type";
            }
        }

        // 5. Check for null bytes (used to bypass extension checks)
        if (str_contains($originalName, "\0") || str_contains($content, "\0\0\0\0\0")) {
            $threats[] = "Null byte injection detected";
        }

        // 6. ClamAV scan if available
        if (file_exists('/usr/bin/clamscan')) {
            try {
                $process = new Process(['/usr/bin/clamscan', '--no-summary', $file->getRealPath()]);
                $process->setTimeout(30);
                $process->run();
                if ($process->getExitCode() === 1) {
                    $threats[] = "ClamAV virus detected: " . trim($process->getOutput());
                }
            } catch (\Exception $e) {}
        }

        return $threats;
    }

    public function scanDirectory(string $path): array
    {
        $threats = [];
        if (!is_dir($path)) return $threats;

        $directory = new \RecursiveDirectoryIterator($path);
        $iterator = new \RecursiveIteratorIterator($directory);

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $filePath = $file->getPathname();
                $ext = strtolower($file->getExtension());

                // Read and check content of php or potential web files
                $webExtensions = ['php', 'phtml', 'html', 'htm', 'js', 'txt', 'htaccess'];
                if (in_array($ext, $webExtensions)) {
                    try {
                        $content = file_get_contents($filePath);
                        foreach ($this->shellSignatures as $signature) {
                            if (stripos($content, $signature) !== false) {
                                $threats[] = [
                                    'file' => $filePath,
                                    'threat' => $signature
                                ];
                                break;
                            }
                        }
                    } catch (\Exception $e) {}
                }
            }
        }

        return $threats;
    }

    public function sanitizeFilename(string $filename): string
    {
        $filename = basename($filename);
        $filename = str_replace("\0", '', $filename);
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
        return substr($filename, 0, 255);
    }
}
