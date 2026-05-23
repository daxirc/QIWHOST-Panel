<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\HostingAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FileManagerController extends Controller
{
    private function getJailedPath(HostingAccount $account, $path)
    {
        $jailRoot = "/home/{$account->system_username}";
        
        if (empty($path)) {
            $path = 'public_html';
        }

        // Clean up path separators
        $path = str_replace(['\\', '//'], '/', $path);
        
        // Remove trailing and leading slashes/dots
        $path = trim($path, '/');
        
        // Construct full absolute path
        $absolutePath = $jailRoot . '/' . $path;
        
        // Check for directory traversal
        $realJail = realpath($jailRoot);
        $realPath = realpath($absolutePath);

        // Fallback check if the file/folder doesn't exist yet
        if ($realPath === false) {
            $parts = array_filter(explode('/', $path), 'strlen');
            $resolvedParts = [];
            foreach ($parts as $part) {
                if ($part === '.') continue;
                if ($part === '..') {
                    array_pop($resolvedParts);
                } else {
                    $resolvedParts[] = $part;
                }
            }
            $canonicalizedPath = $jailRoot . '/' . implode('/', $resolvedParts);
            
            if (strpos($canonicalizedPath, $jailRoot) !== 0) {
                throw new \InvalidArgumentException("Access Denied: Path traversal detected.");
            }
            return $canonicalizedPath;
        }

        if (strpos($realPath, $jailRoot) !== 0) {
            throw new \InvalidArgumentException("Access Denied: Path traversal detected.");
        }

        return $realPath;
    }

    private function getHostingAccount(Request $request)
    {
        $customer = $request->user();
        $hostingAccountId = $request->header('X-Hosting-Account-Id') ?? $request->input('hosting_account_id');
        $hostingAccount = $hostingAccountId 
            ? $customer->hostingAccounts()->find($hostingAccountId) 
            : $customer->hostingAccounts()->first();

        if (!$hostingAccount) {
            throw new \RuntimeException("No hosting account selected or found.");
        }

        return $hostingAccount;
    }

    public function list(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $inputPath = $request->input('path', 'public_html');
            $jailedPath = $this->getJailedPath($account, $inputPath);

            if (!File::exists($jailedPath)) {
                // If it doesn't exist in dev, auto-create public_html
                if ($inputPath === 'public_html') {
                    File::makeDirectory($jailedPath, 0755, true);
                } else {
                    return $this->errorResponse("Directory does not exist.");
                }
            }

            if (!File::isDirectory($jailedPath)) {
                return $this->errorResponse("Specified path is not a directory.");
            }

            $files = File::files($jailedPath);
            $directories = File::directories($jailedPath);

            $result = [];

            // Add parent directory link if not at root
            $jailRoot = "/home/{$account->system_username}";
            $relativeDir = trim(str_replace($jailRoot, '', str_replace('\\', '/', $jailedPath)), '/');

            foreach ($directories as $dir) {
                $dirPath = str_replace('\\', '/', $dir);
                $rel = trim(str_replace($jailRoot, '', $dirPath), '/');
                $result[] = [
                    'name' => basename($dir),
                    'path' => $rel,
                    'type' => 'directory',
                    'size' => 0,
                    'modified' => filemtime($dir),
                    'permissions' => substr(sprintf('%o', fileperms($dir)), -4),
                ];
            }

            foreach ($files as $file) {
                $filePath = str_replace('\\', '/', $file->getPathname());
                $rel = trim(str_replace($jailRoot, '', $filePath), '/');
                $result[] = [
                    'name' => $file->getFilename(),
                    'path' => $rel,
                    'type' => 'file',
                    'size' => $file->getSize(),
                    'modified' => $file->getMTime(),
                    'permissions' => substr(sprintf('%o', $file->getPerms()), -4),
                ];
            }

            return $this->successResponse([
                'current_path' => $relativeDir,
                'items' => $result,
            ], 'Files listed successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function readFile(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $inputPath = $request->input('path');
            
            if (!$inputPath) {
                return $this->errorResponse("File path is required.");
            }

            $jailedPath = $this->getJailedPath($account, $inputPath);

            if (!File::exists($jailedPath) || File::isDirectory($jailedPath)) {
                return $this->errorResponse("File does not exist or is a directory.");
            }

            $content = File::get($jailedPath);
            
            // Check if binary (simple heuristic)
            if (mb_detect_encoding($content, 'UTF-8', true) === false) {
                return $this->successResponse([
                    'is_binary' => true,
                    'content' => base64_encode($content),
                ], 'Binary file read successfully.');
            }

            return $this->successResponse([
                'is_binary' => false,
                'content' => $content,
            ], 'File read successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function writeFile(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $inputPath = $request->input('path');
            $content = $request->input('content', '');

            if (!$inputPath) {
                return $this->errorResponse("File path is required.");
            }

            $jailedPath = $this->getJailedPath($account, $inputPath);

            // Ensure parent directory exists
            $parentDir = dirname($jailedPath);
            if (!File::exists($parentDir)) {
                File::makeDirectory($parentDir, 0755, true);
            }

            File::put($jailedPath, $content);

            return $this->successResponse(null, 'File written successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function createFileOrFolder(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $inputPath = $request->input('path');
            $type = $request->input('type', 'file'); // 'file' or 'directory'

            if (!$inputPath) {
                return $this->errorResponse("Path is required.");
            }

            $jailedPath = $this->getJailedPath($account, $inputPath);

            if (File::exists($jailedPath)) {
                return $this->errorResponse("File or folder already exists.");
            }

            if ($type === 'directory') {
                File::makeDirectory($jailedPath, 0755, true);
            } else {
                // Ensure parent directory exists
                $parentDir = dirname($jailedPath);
                if (!File::exists($parentDir)) {
                    File::makeDirectory($parentDir, 0755, true);
                }
                File::put($jailedPath, '');
            }

            return $this->successResponse(null, ucfirst($type) . ' created successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function upload(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $destinationDir = $request->input('path', 'public_html');
            
            if (!$request->hasFile('file')) {
                return $this->errorResponse("No file was uploaded.");
            }

            $file = $request->file('file');
            
            // Integrate Security Scanner & Sanitizer
            $scanner = new \App\Services\SecurityScanner();
            $filename = $scanner->sanitizeFilename($file->getClientOriginalName());

            $threats = $scanner->scanFile($file);
            if (!empty($threats)) {
                // Log incident to database (Correction 5)
                \DB::table('security_events')->insert([
                    'hosting_account_id' => $account->id,
                    'event_type' => 'shell_upload_blocked',
                    'description' => "Blocked malicious file upload: " . implode(', ', $threats),
                    'ip_address' => $request->ip() ?? '127.0.0.1',
                    'file_path' => $filename,
                    'blocked' => true,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'File blocked: Security threat detected',
                    'threats' => $threats
                ], 422);
            }

            $jailedDir = $this->getJailedPath($account, $destinationDir);

            if (!File::exists($jailedDir)) {
                File::makeDirectory($jailedDir, 0755, true);
            }
            
            $file->move($jailedDir, $filename);

            return $this->successResponse(null, 'File uploaded successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function delete(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $inputPath = $request->input('path');

            if (!$inputPath) {
                return $this->errorResponse("Path is required.");
            }

            $jailedPath = $this->getJailedPath($account, $inputPath);

            if (!File::exists($jailedPath)) {
                return $this->errorResponse("File or folder does not exist.");
            }

            if (File::isDirectory($jailedPath)) {
                File::deleteDirectory($jailedPath);
            } else {
                File::delete($jailedPath);
            }

            return $this->successResponse(null, 'Deleted successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
