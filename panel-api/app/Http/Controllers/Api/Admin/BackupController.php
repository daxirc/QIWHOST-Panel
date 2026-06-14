<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Backup;
use App\Models\HostingAccount;
use App\Services\BackupService;
use App\Jobs\CreateBackupJob;
use Illuminate\Http\Request;

class BackupController extends Controller
{
    public function __construct(private BackupService $backupService) {}

    public function index(Request $request)
    {
        try {
            $query = Backup::with('hostingAccount')->orderBy('created_at', 'desc');

            if ($request->has('hosting_account_id')) {
                $query->where('hosting_account_id', $request->input('hosting_account_id'));
            }
            if ($request->has('backup_type')) {
                $query->where('backup_type', $request->input('backup_type'));
            }
            if ($request->has('status')) {
                $query->where('status', $request->input('status'));
            }

            $backups = $query->paginate(50);
            return $this->successResponse($backups, 'Backups retrieved successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function create(Request $request)
    {
        try {
            $validated = $request->validate([
                'hosting_account_id' => 'required|exists:hosting_accounts,id',
                'backup_type' => 'required|in:full,files,database',
            ]);

            $account = HostingAccount::findOrFail($validated['hosting_account_id']);

            // Run synchronously for now (queue can be enabled later)
            $backup = $this->backupService->createBackup($account, $validated['backup_type']);

            return $this->successResponse($backup, 'Backup created successfully.', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function download(Request $request, $id)
    {
        try {
            $backup = Backup::findOrFail($id);
            if ($backup->status !== 'completed') {
                return $this->errorResponse('Backup is not ready for download.');
            }

            $localPath = $this->backupService->downloadFromRemote($backup);
            return response()->download($localPath, $backup->file_name)
                ->deleteFileAfterSend($backup->storage_type === 'remote');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function restore(Request $request, $id)
    {
        try {
            $backup = Backup::findOrFail($id);
            if ($backup->status !== 'completed') {
                return $this->errorResponse('Cannot restore incomplete backup.');
            }

            $restoreType = $request->input('restore_type', 'all');
            $log = $this->backupService->restoreBackup($backup, $restoreType);

            $backup->update([
                'backup_log' => $backup->backup_log . "\n--- RESTORE ---\n" . $log,
            ]);

            return $this->successResponse(['log' => $log], 'Backup restored successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse('Restore failed: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $backup = Backup::findOrFail($id);
            $this->backupService->deleteFromRemote($backup);
            $backup->delete();
            return $this->successResponse(null, 'Backup deleted successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function stats()
    {
        try {
            $remoteStats = $this->backupService->getRemoteStorageStats();
            $dbStats = [
                'total_backups' => Backup::count(),
                'completed_backups' => Backup::where('status', 'completed')->count(),
                'pending_backups' => Backup::whereIn('status', ['pending', 'queued'])->count(),
                'failed_backups' => Backup::where('status', 'failed')->count(),
                'total_size' => Backup::where('status', 'completed')->sum('size'),
            ];

            return $this->successResponse(['remote' => $remoteStats, 'database' => $dbStats], 'Stats retrieved.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function runAll()
    {
        try {
            $accounts = HostingAccount::where('status', 'active')->get();
            $count = 0;
            foreach ($accounts as $account) {
                CreateBackupJob::dispatch($account, 'full');
                $count++;
            }
            return $this->successResponse(['queued' => $count], "{$count} backup jobs queued.");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function testConnection(Request $request)
    {
        try {
            $validated = $request->validate([
                'host' => 'required|string',
                'port' => 'required|integer',
                'user' => 'required|string',
                'password' => 'required|string',
                'path' => 'required|string',
            ]);

            $result = $this->backupService->testConnection(
                $validated['host'], $validated['port'], $validated['user'],
                $validated['password'], $validated['path']
            );

            return $result['success']
                ? $this->successResponse($result, $result['message'])
                : $this->errorResponse($result['message']);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
