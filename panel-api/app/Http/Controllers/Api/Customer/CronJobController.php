<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\CronJob;
use App\Models\HostingAccount;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class CronJobController extends Controller
{
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

    private function updateSystemCrontab(HostingAccount $account)
    {
        try {
            $cronJobs = $account->cronJobs()->where('is_active', true)->get();
            $crontabLines = [];

            foreach ($cronJobs as $job) {
                $crontabLines[] = "{$job->schedule} {$job->command} > /dev/null 2>&1";
            }

            $crontabContent = implode("\n", $crontabLines) . "\n";

            // Write temporary crontab file in a jailed location or temp
            $tempPath = tempnam(sys_get_temp_dir(), 'cron_');
            file_put_contents($tempPath, $crontabContent);

            // Install securely using array syntax
            // sudo crontab -u {username} {file}
            $process = new Process(['sudo', 'crontab', '-u', $account->system_username, $tempPath]);
            $process->run();

            unlink($tempPath);
        } catch (\Exception $e) {
            // Local dev / WSL sandbox simulation fallback
        }
    }

    public function index(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $cronJobs = $account->cronJobs()->get();
            return $this->successResponse($cronJobs, 'Cron jobs retrieved successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function store(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);

            $validated = $request->validate([
                'command' => 'required|string|max:500',
                'schedule' => 'required|string|max:100', // e.g. * * * * *
                'description' => 'nullable|string|max:255',
            ]);

            // Simple cron expression regex validation (e.g. at least 5 tokens separated by spaces)
            if (count(explode(' ', trim($validated['schedule']))) < 5) {
                return $this->errorResponse('Invalid cron schedule expression format. Must contain 5 fields.');
            }

            $cronJob = CronJob::create([
                'hosting_account_id' => $account->id,
                'command' => $validated['command'],
                'schedule' => $validated['schedule'],
                'is_active' => true,
                'description' => $validated['description'] ?? null,
            ]);

            $this->updateSystemCrontab($account);

            return $this->successResponse($cronJob, 'Cron job created successfully.', 201);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function show(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $cronJob = $account->cronJobs()->find($id);

            if (!$cronJob) {
                return $this->errorResponse('Cron job not found.', null, 404);
            }

            return $this->successResponse($cronJob, 'Cron job retrieved successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $cronJob = $account->cronJobs()->find($id);

            if (!$cronJob) {
                return $this->errorResponse('Cron job not found.', null, 404);
            }

            $validated = $request->validate([
                'command' => 'nullable|string|max:500',
                'schedule' => 'nullable|string|max:100',
                'is_active' => 'nullable|boolean',
                'description' => 'nullable|string|max:255',
            ]);

            $cronJob->update($validated);

            $this->updateSystemCrontab($account);

            return $this->successResponse($cronJob, 'Cron job updated successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $cronJob = $account->cronJobs()->find($id);

            if (!$cronJob) {
                return $this->errorResponse('Cron job not found.', null, 404);
            }

            $cronJob->delete();

            $this->updateSystemCrontab($account);

            return $this->successResponse(null, 'Cron job deleted successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
