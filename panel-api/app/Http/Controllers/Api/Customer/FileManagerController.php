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
            $relativeDir = '/' . trim(str_replace($jailRoot, '', str_replace('\\', '/', $jailedPath)), '/');

            foreach ($directories as $dir) {
                $dirPath = str_replace('\\', '/', $dir);
                $rel = '/' . trim(str_replace($jailRoot, '', $dirPath), '/');
                $result[] = [
                    'name' => basename($dir),
                    'path' => $rel,
                    'type' => 'directory',
                    'size' => 0,
                    'modified' => filemtime($dir),
                    'permissions' => substr(sprintf('%o', fileperms($dir)), -3),
                    'is_writable' => is_writable($dir),
                    'extension' => '',
                ];
            }

            foreach ($files as $file) {
                $filePath = str_replace('\\', '/', $file->getPathname());
                $rel = '/' . trim(str_replace($jailRoot, '', $filePath), '/');
                $result[] = [
                    'name' => $file->getFilename(),
                    'path' => $rel,
                    'type' => 'file',
                    'size' => $file->getSize(),
                    'modified' => $file->getMTime(),
                    'permissions' => substr(sprintf('%o', $file->getPerms()), -3),
                    'is_writable' => is_writable($filePath),
                    'extension' => strtolower($file->getExtension()),
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
                // Log incident to database
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
            $paths = $request->input('paths');
            
            // compatibility with old single 'path' input
            if (empty($paths)) {
                $paths = $request->input('path');
            }

            if (!$paths) {
                return $this->errorResponse("Paths to delete are required.");
            }

            if (!is_array($paths)) {
                $paths = [$paths];
            }

            foreach ($paths as $path) {
                $jailedPath = $this->getJailedPath($account, $path);
                if (File::exists($jailedPath)) {
                    if (File::isDirectory($jailedPath)) {
                        File::deleteDirectory($jailedPath);
                    } else {
                        File::delete($jailedPath);
                    }
                }
            }

            return $this->successResponse(null, 'Deleted successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function rename(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $oldPath = $request->input('path');
            $newName = $request->input('new_name');

            if (!$oldPath || !$newName) {
                return $this->errorResponse("Both old path and new name are required.");
            }

            if (strpos($newName, '/') !== false || strpos($newName, '\\') !== false) {
                return $this->errorResponse("New name must not contain path separators.");
            }

            $oldJailedPath = $this->getJailedPath($account, $oldPath);
            if (!File::exists($oldJailedPath)) {
                return $this->errorResponse("Original file or folder does not exist.");
            }

            $parentDir = dirname($oldJailedPath);
            $newJailedPath = $parentDir . '/' . $newName;

            $jailRoot = "/home/{$account->system_username}";
            if (strpos($newJailedPath, $jailRoot) !== 0) {
                return $this->errorResponse("Access Denied: Traversal attempt.");
            }

            if (File::exists($newJailedPath)) {
                return $this->errorResponse("A file or folder with the new name already exists.");
            }

            if (rename($oldJailedPath, $newJailedPath)) {
                return $this->successResponse(null, "Item renamed successfully.");
            } else {
                return $this->errorResponse("Failed to rename item.");
            }
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function move(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $sourcePath = $request->input('source_path');
            $destPath = $request->input('destination_path');

            if (!$sourcePath || !$destPath) {
                return $this->errorResponse("Both source and destination paths are required.");
            }

            $sourceJailed = $this->getJailedPath($account, $sourcePath);
            $destJailed = $this->getJailedPath($account, $destPath);

            if (!File::exists($sourceJailed)) {
                return $this->errorResponse("Source file or folder does not exist.");
            }

            if (File::exists($destJailed) && File::isDirectory($destJailed)) {
                $destJailed = rtrim($destJailed, '/') . '/' . basename($sourceJailed);
            }

            $jailRoot = "/home/{$account->system_username}";
            if (strpos($sourceJailed, $jailRoot) !== 0 || strpos($destJailed, $jailRoot) !== 0) {
                return $this->errorResponse("Access Denied: Path traversal detected.");
            }

            if (File::exists($destJailed)) {
                return $this->errorResponse("Destination file or folder already exists.");
            }

            if (rename($sourceJailed, $destJailed)) {
                return $this->successResponse(null, "Item moved successfully.");
            } else {
                return $this->errorResponse("Failed to move item.");
            }
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function copy(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $sourcePath = $request->input('source_path');
            $destPath = $request->input('destination_path');

            if (!$sourcePath || !$destPath) {
                return $this->errorResponse("Both source and destination paths are required.");
            }

            $sourceJailed = $this->getJailedPath($account, $sourcePath);
            $destJailed = $this->getJailedPath($account, $destPath);

            if (!File::exists($sourceJailed)) {
                return $this->errorResponse("Source file or folder does not exist.");
            }

            if (File::exists($destJailed) && File::isDirectory($destJailed)) {
                $destJailed = rtrim($destJailed, '/') . '/' . basename($sourceJailed);
            }

            $jailRoot = "/home/{$account->system_username}";
            if (strpos($sourceJailed, $jailRoot) !== 0 || strpos($destJailed, $jailRoot) !== 0) {
                return $this->errorResponse("Access Denied: Path traversal detected.");
            }

            if (File::exists($destJailed)) {
                return $this->errorResponse("Destination file or folder already exists.");
            }

            if (File::isDirectory($sourceJailed)) {
                if (File::copyDirectory($sourceJailed, $destJailed)) {
                    return $this->successResponse(null, "Folder copied successfully.");
                }
            } else {
                if (copy($sourceJailed, $destJailed)) {
                    return $this->successResponse(null, "File copied successfully.");
                }
            }

            return $this->errorResponse("Failed to copy item.");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function download(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $inputPath = $request->input('path');

            if (!$inputPath) {
                return response()->json(['success' => false, 'message' => "Path is required."], 400);
            }

            $jailedPath = $this->getJailedPath($account, $inputPath);

            if (!File::exists($jailedPath) || File::isDirectory($jailedPath)) {
                return response()->json(['success' => false, 'message' => "File does not exist."], 404);
            }

            $filename = basename($jailedPath);
            return response()->download($jailedPath, $filename, [
                'Content-Type' => 'application/octet-stream',
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function downloadZip(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $paths = $request->input('paths');

            if (empty($paths)) {
                $paths = $request->input('path');
            }

            if (empty($paths)) {
                return response()->json(['success' => false, 'message' => "Paths are required."], 400);
            }

            if (!is_array($paths)) {
                $paths = [$paths];
            }

            $zip = new \ZipArchive();
            $tempZipFile = tempnam(sys_get_temp_dir(), 'qiwzip') . '.zip';

            if ($zip->open($tempZipFile, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
                return response()->json(['success' => false, 'message' => "Could not create temporary ZIP archive."], 500);
            }

            foreach ($paths as $path) {
                $jailed = $this->getJailedPath($account, $path);
                if (File::exists($jailed)) {
                    $this->addPathToZip($zip, $jailed, basename($jailed));
                }
            }

            $zip->close();

            return response()->download($tempZipFile, 'archive.zip')->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function compress(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $paths = $request->input('paths');
            $zipName = $request->input('zip_name');
            $destPath = $request->input('destination_path');

            if (empty($paths) || !$zipName || !$destPath) {
                return $this->errorResponse("Paths, zip name, and destination path are all required.");
            }

            if (!is_array($paths)) {
                $paths = [$paths];
            }

            if (substr(strtolower($zipName), -4) !== '.zip') {
                $zipName .= '.zip';
            }

            $destDirJailed = $this->getJailedPath($account, $destPath);
            $zipFileJailed = rtrim($destDirJailed, '/') . '/' . $zipName;

            $jailRoot = "/home/{$account->system_username}";
            if (strpos($zipFileJailed, $jailRoot) !== 0) {
                return $this->errorResponse("Access Denied: Path traversal detected.");
            }

            $zip = new \ZipArchive();
            if ($zip->open($zipFileJailed, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
                return $this->errorResponse("Failed to create ZIP archive.");
            }

            foreach ($paths as $path) {
                $jailed = $this->getJailedPath($account, $path);
                if (File::exists($jailed)) {
                    $this->addPathToZip($zip, $jailed, basename($jailed));
                }
            }

            $zip->close();

            return $this->successResponse(null, "Archive created successfully: $zipName");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function extract(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $zipPath = $request->input('path');
            $destPath = $request->input('destination');

            if (!$zipPath || !$destPath) {
                return $this->errorResponse("Both ZIP path and destination folder are required.");
            }

            if (substr(strtolower($zipPath), -4) !== '.zip') {
                return $this->errorResponse("Only .zip archives are supported for extraction.");
            }

            $zipJailed = $this->getJailedPath($account, $zipPath);
            $destJailed = $this->getJailedPath($account, $destPath);

            if (!File::exists($zipJailed)) {
                return $this->errorResponse("ZIP archive does not exist.");
            }

            if (!File::exists($destJailed)) {
                File::makeDirectory($destJailed, 0755, true);
            }

            $jailRoot = "/home/{$account->system_username}";
            if (strpos($destJailed, $jailRoot) !== 0) {
                return $this->errorResponse("Access Denied: Traversal attempt.");
            }

            $zip = new \ZipArchive();
            if ($zip->open($zipJailed) === true) {
                $extractedFiles = [];
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $extractedFiles[] = $zip->getNameIndex($i);
                }

                $zip->extractTo($destJailed);
                $zip->close();

                return $this->successResponse([
                    'extracted' => $extractedFiles
                ], "Archive extracted successfully.");
            } else {
                return $this->errorResponse("Failed to open ZIP archive.");
            }
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function chmod(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $inputPath = $request->input('path');
            $permissions = $request->input('permissions');

            if (!$inputPath || !$permissions) {
                return $this->errorResponse("Both path and permissions are required.");
            }

            $permissions = ltrim($permissions, '0');
            if (!preg_match('/^[0-7]{3}$/', $permissions)) {
                return $this->errorResponse("Permissions must be exactly 3 octal digits (e.g. 755).");
            }

            $jailedPath = $this->getJailedPath($account, $inputPath);
            if (!File::exists($jailedPath)) {
                return $this->errorResponse("File or folder does not exist.");
            }

            $octalMode = octdec('0' . $permissions);
            if (chmod($jailedPath, $octalMode)) {
                $newPerms = substr(sprintf('%o', fileperms($jailedPath)), -3);
                return $this->successResponse([
                    'permissions' => $newPerms
                ], "Permissions updated successfully to $newPerms.");
            } else {
                return $this->errorResponse("Failed to update permissions.");
            }
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function search(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $query = $request->input('query');
            $searchPath = $request->input('path', 'public_html');

            if (empty($query)) {
                return $this->errorResponse("Search query is required.");
            }

            $searchJailed = $this->getJailedPath($account, $searchPath);

            if (!File::exists($searchJailed) || !File::isDirectory($searchJailed)) {
                return $this->errorResponse("Search directory does not exist.");
            }

            $jailRoot = "/home/{$account->system_username}";
            $results = [];

            $directoryIterator = new \RecursiveDirectoryIterator($searchJailed, \RecursiveDirectoryIterator::SKIP_DOTS);
            $iterator = new \RecursiveIteratorIterator($directoryIterator, \RecursiveIteratorIterator::SELF_FIRST);

            $count = 0;
            foreach ($iterator as $item) {
                if ($count >= 50) {
                    break;
                }

                $filename = $item->getFilename();
                if (stripos($filename, $query) !== false) {
                    $itemRealPath = str_replace('\\', '/', $item->getRealPath());
                    $relative = '/' . trim(str_replace($jailRoot, '', $itemRealPath), '/');
                    
                    $results[] = [
                        'name' => $filename,
                        'path' => $relative,
                        'type' => $item->isDir() ? 'directory' : 'file',
                        'size' => $item->isDir() ? 0 : $item->getSize(),
                    ];
                    $count++;
                }
            }

            return $this->successResponse($results, "Search completed successfully. Found $count items.");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function getSize(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $inputPath = $request->input('path');

            if (!$inputPath) {
                return $this->errorResponse("Path is required.");
            }

            $jailedPath = $this->getJailedPath($account, $inputPath);

            if (!File::exists($jailedPath)) {
                return $this->errorResponse("Item does not exist.");
            }

            if (File::isDirectory($jailedPath)) {
                $bytes = $this->getFolderSize($jailedPath);
            } else {
                $bytes = filesize($jailedPath);
            }

            return $this->successResponse([
                'bytes' => $bytes,
                'human' => $this->formatBytes($bytes),
            ], "Size retrieved successfully.");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    private function addPathToZip(\ZipArchive $zip, $absolutePath, $zipPath)
    {
        if (File::isDirectory($absolutePath)) {
            $zip->addEmptyDir($zipPath);
            $files = File::allFiles($absolutePath);
            foreach ($files as $file) {
                $fileRealPath = $file->getRealPath();
                $relativeZipPath = $zipPath . '/' . trim(str_replace($absolutePath, '', $fileRealPath), '/');
                $zip->addFile($fileRealPath, $relativeZipPath);
            }
        } else {
            $zip->addFile($absolutePath, $zipPath);
        }
    }

    private function getFolderSize($dir)
    {
        $size = 0;
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS)) as $file) {
            $size += $file->getSize();
        }
        return $size;
    }

    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
