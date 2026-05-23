<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Process\Process;

class SecurityController extends Controller
{
    public function events()
    {
        try {
            $events = DB::table('security_events')
                ->join('hosting_accounts', 'security_events.hosting_account_id', '=', 'hosting_accounts.id')
                ->join('customers', 'hosting_accounts.customer_id', '=', 'customers.id')
                ->select(
                    'security_events.*',
                    'customers.name as owner',
                    'hosting_accounts.system_username as username'
                )
                ->orderBy('security_events.created_at', 'desc')
                ->get();

            return $this->successResponse($events, 'Security events log retrieved.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function quarantine()
    {
        try {
            $quarantine = DB::table('quarantine')
                ->join('hosting_accounts', 'quarantine.hosting_account_id', '=', 'hosting_accounts.id')
                ->select('quarantine.*', 'hosting_accounts.system_username as username')
                ->orderBy('quarantine.created_at', 'desc')
                ->get();

            return $this->successResponse($quarantine, 'Quarantine files retrieved.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function runScan()
    {
        try {
            Artisan::call('security:scan', ['--quarantine' => true]);
            $output = Artisan::output();
            
            return $this->successResponse([
                'console_output' => $output,
                'last_scan_time' => now()->toDateTimeString()
            ], 'Cluster security malware scan executed successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function deleteQuarantined($id)
    {
        try {
            $file = DB::table('quarantine')->where('id', $id)->first();
            if (!$file) {
                return $this->errorResponse('Quarantined file not found.', null, 404);
            }

            if (file_exists($file->quarantine_path)) {
                unlink($file->quarantine_path);
            }

            DB::table('quarantine')->where('id', $id)->delete();
            return $this->successResponse(null, 'Quarantined file permanently purged from system.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function restore($id)
    {
        try {
            $file = DB::table('quarantine')->where('id', $id)->first();
            if (!$file) {
                return $this->errorResponse('Quarantined file not found.', null, 404);
            }

            if (file_exists($file->quarantine_path)) {
                // Ensure directories exist
                $dir = dirname($file->original_path);
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }

                // Restore
                rename($file->quarantine_path, $file->original_path);

                // Set proper permissions
                $account = DB::table('hosting_accounts')->where('id', $file->hosting_account_id)->first();
                if ($account) {
                    $chown = new Process(['sudo', 'chown', "{$account->system_username}:{$account->system_username}", $file->original_path]);
                    $chown->run();
                }
            }

            DB::table('quarantine')->where('id', $id)->delete();
            return $this->successResponse(null, 'Quarantined file successfully restored to original location.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
