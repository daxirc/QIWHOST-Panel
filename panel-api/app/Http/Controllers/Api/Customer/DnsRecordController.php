<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\DnsRecord;
use App\Models\Domain;
use App\Models\HostingAccount;
use Illuminate\Http\Request;

class DnsRecordController extends Controller
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

    public function index(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);
            $domainId = $request->query('domain_id');

            if (!$domainId) {
                return $this->errorResponse('Domain ID is required for DNS listing.');
            }

            // Verify domain belongs to customer
            $domain = $account->domains()->find($domainId);
            if (!$domain) {
                return $this->errorResponse('Domain not found or unauthorized.', null, 404);
            }

            $records = $domain->dnsRecords()->get();
            return $this->successResponse($records, 'DNS records retrieved successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function store(Request $request)
    {
        try {
            $account = $this->getHostingAccount($request);

            $validated = $request->validate([
                'domain_id' => 'required|exists:domains,id',
                'name' => 'required|string|max:255',
                'type' => 'required|string|in:A,AAAA,CNAME,MX,TXT,NS,SRV,CAA',
                'value' => 'required|string',
                'ttl' => 'nullable|integer|min:60',
                'priority' => 'nullable|integer|min:0',
            ]);

            // Verify domain ownership
            $domain = $account->domains()->find($validated['domain_id']);
            if (!$domain) {
                return $this->errorResponse('Domain not found or unauthorized.', null, 403);
            }

            $record = DnsRecord::create([
                'domain_id' => $validated['domain_id'],
                'name' => $validated['name'],
                'type' => $validated['type'],
                'value' => $validated['value'],
                'ttl' => $validated['ttl'] ?? 3600,
                'priority' => $validated['priority'] ?? null,
            ]);

            return $this->successResponse($record, 'DNS record created successfully.', 201);

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $record = DnsRecord::find($id);

            if (!$record) {
                return $this->errorResponse('DNS record not found.', null, 404);
            }

            // Verify ownership via domain
            $domain = $account->domains()->find($record->domain_id);
            if (!$domain) {
                return $this->errorResponse('Unauthorized to modify this DNS record.', null, 403);
            }

            // Block modifying primary root A or NS records' host name or type
            if (($record->type === 'A' && ($record->name === '@' || empty($record->name))) || 
                ($record->type === 'NS' && ($record->name === '@' || empty($record->name)))) {
                if ($request->has('type') && $request->input('type') !== $record->type) {
                    return $this->errorResponse('Modifying the type of primary root DNS records is not allowed.', null, 400);
                }
                if ($request->has('name') && $request->input('name') !== $record->name) {
                    return $this->errorResponse('Modifying the host name of primary root DNS records is not allowed.', null, 400);
                }
                if ($request->has('value') && empty($request->input('value'))) {
                    return $this->errorResponse('Value cannot be empty for primary root DNS records.', null, 400);
                }
            }

            $validated = $request->validate([
                'name' => 'nullable|string|max:255',
                'type' => 'nullable|string|in:A,AAAA,CNAME,MX,TXT,NS,SRV,CAA',
                'value' => 'nullable|string',
                'ttl' => 'nullable|integer|min:60',
                'priority' => 'nullable|integer|min:0',
            ]);

            $record->update($validated);

            return $this->successResponse($record, 'DNS record updated successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $account = $this->getHostingAccount($request);
            $record = DnsRecord::find($id);

            if (!$record) {
                return $this->errorResponse('DNS record not found.', null, 404);
            }

            // Verify ownership via domain
            $domain = $account->domains()->find($record->domain_id);
            if (!$domain) {
                return $this->errorResponse('Unauthorized to delete this DNS record.', null, 403);
            }

            // Block deleting root A and NS records
            if (($record->type === 'A' && ($record->name === '@' || empty($record->name))) || 
                ($record->type === 'NS' && ($record->name === '@' || empty($record->name)))) {
                return $this->errorResponse('Deleting primary root A or NS records is not allowed as it will break your domain hosting.', null, 400);
            }

            $record->delete();

            return $this->successResponse(null, 'DNS record deleted successfully.');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Advanced Email Anti-Spam protection wizard (SPF, DKIM, DMARC TXT record compiler)
     */
    public function generateEmailSpamProtection(Request $request, $domainId)
    {
        try {
            $account = $this->getHostingAccount($request);
            $domain = $account->domains()->find($domainId);

            if (!$domain) {
                return $this->errorResponse('Domain not found or unauthorized.', null, 404);
            }

            $validated = $request->validate([
                // SPF Setup
                'spf_allow_mx' => 'nullable|boolean',
                'spf_allow_a' => 'nullable|boolean',
                'spf_ipv4' => 'nullable|string', // comma separated list
                'spf_fail_type' => 'required|in:softfail,fail,neutral',
                
                // DMARC Setup
                'dmarc_policy' => 'required|in:none,quarantine,reject',
                'dmarc_rua' => 'nullable|email', // Reporting address
                'dmarc_pct' => 'nullable|integer|min:1|max:100',
                
                // DKIM Setup
                'dkim_selector' => 'nullable|string|alpha_dash',
                'dkim_key' => 'nullable|string',
            ]);

            $recordsCreated = [];

            // 1. Compile & Save SPF TXT Record
            $spfMX = ($validated['spf_allow_mx'] ?? true) ? ' mx' : '';
            $spfA = ($validated['spf_allow_a'] ?? true) ? ' a' : '';
            
            $spfIps = '';
            if (!empty($validated['spf_ipv4'])) {
                $ips = array_filter(array_map('trim', explode(',', $validated['spf_ipv4'])));
                foreach ($ips as $ip) {
                    $spfIps .= " ip4:{$ip}";
                }
            }

            $spfFail = '-all'; // default hardfail
            if ($validated['spf_fail_type'] === 'softfail') {
                $spfFail = '~all';
            } elseif ($validated['spf_fail_type'] === 'neutral') {
                $spfFail = '?all';
            }

            $spfValue = "v=spf1{$spfA}{$spfMX}{$spfIps} ~all"; // standard secure base
            
            // Delete existing SPF TXT record for this domain if exists
            DnsRecord::where('domain_id', $domain->id)
                ->where('name', '@')
                ->where('type', 'TXT')
                ->where('value', 'like', 'v=spf1%')
                ->delete();

            $spfRecord = DnsRecord::create([
                'domain_id' => $domain->id,
                'name' => '@',
                'type' => 'TXT',
                'value' => $spfValue,
                'ttl' => 3600,
            ]);
            $recordsCreated[] = $spfRecord;

            // 2. Compile & Save DMARC TXT Record
            $dmarcPolicy = $validated['dmarc_policy'];
            $dmarcRua = !empty($validated['dmarc_rua']) ? "; rua=mailto:{$validated['dmarc_rua']}" : '';
            $dmarcPct = isset($validated['dmarc_pct']) ? "; pct={$validated['dmarc_pct']}" : '';
            
            $dmarcValue = "v=DMARC1; p={$dmarcPolicy}{$dmarcRua}{$dmarcPct}";

            // Delete existing DMARC TXT record
            DnsRecord::where('domain_id', $domain->id)
                ->where('name', '_dmarc')
                ->where('type', 'TXT')
                ->delete();

            $dmarcRecord = DnsRecord::create([
                'domain_id' => $domain->id,
                'name' => '_dmarc',
                'type' => 'TXT',
                'value' => $dmarcValue,
                'ttl' => 3600,
            ]);
            $recordsCreated[] = $dmarcRecord;

            // 3. Compile & Save DKIM TXT Record if provided
            if (!empty($validated['dkim_selector']) && !empty($validated['dkim_key'])) {
                $selector = $validated['dkim_selector'];
                $cleanKey = str_replace(["\r", "\n", "-----BEGIN PUBLIC KEY-----", "-----END PUBLIC KEY-----", " "], "", $validated['dkim_key']);
                $dkimValue = "v=DKIM1; k=rsa; p={$cleanKey}";

                // Delete existing DKIM selector record
                DnsRecord::where('domain_id', $domain->id)
                    ->where('name', "{$selector}._domainkey")
                    ->where('type', 'TXT')
                    ->delete();

                $dkimRecord = DnsRecord::create([
                    'domain_id' => $domain->id,
                    'name' => "{$selector}._domainkey",
                    'type' => 'TXT',
                    'value' => $dkimValue,
                    'ttl' => 3600,
                ]);
                $recordsCreated[] = $dkimRecord;
            }

            return $this->successResponse($recordsCreated, 'Anti-Spam Email Protection DNS records provisioned successfully!');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
