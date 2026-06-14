<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Backup;
use App\Models\HostingAccount;
use App\Services\BackupService;
use Illuminate\Http\Request;

class BackupController extends Controller
{
    public function __construct(private BackupService $backupService) {}

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

    public function index(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $backups = $account->backups()->orderBy('created_at', 'desc')->get();
            return $this->successResponse($backups, 'Backups retrieved successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function create(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);

            $validated = $request->validate([
                'backup_type' => 'required|in:full,files,database',
            ]);

            $backup = $this->backupService->createBackup($account, $validated['backup_type']);

            return $this->successResponse($backup, 'Backup created successfully.', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function download(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $backup = $account->backups()->find($id);

            if (!$backup) {
                return $this->errorResponse('Backup not found.', null, 404);
            }

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
            $account = $this->getHostingAccount($request);
            $backup = $account->backups()->find($id);

            if (!$backup) {
                return $this->errorResponse('Backup not found.', null, 404);
            }

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

    public function destroy(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $backup = $account->backups()->find($id);

            if (!$backup) {
                return $this->errorResponse('Backup not found.', null, 404);
            }

            $this->backupService->deleteFromRemote($backup);
            $backup->delete();

            return $this->successResponse(null, 'Backup deleted successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
