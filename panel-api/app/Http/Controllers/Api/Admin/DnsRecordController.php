<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DnsRecord;
use App\Models\Domain;
use Illuminate\Http\Request;
use App\Models\Setting;
use App\Services\DnsZoneSyncService;

class DnsRecordController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        
        // Return DNS zones (all domains) with records count
        $domains = Domain::with(['hostingAccount.customer']);
        
        if ($search) {
            $domains->where('domain', 'like', "%{$search}%");
        }

        $results = [];
        foreach ($domains->get() as $dom) {
            $count = DnsRecord::where('domain_id', $dom->id)->count();
            $results[] = [
                'id' => $dom->id,
                'domain' => $dom->domain,
                'owner' => $dom->hostingAccount->customer->name ?? 'System',
                'record_count' => $count,
                'status' => $dom->status,
            ];
        }

        return $this->successResponse($results, 'DNS zones compiled successfully.');
    }

    public function getZone($domainId)
    {
        $domain = Domain::findOrFail($domainId);
        $records = DnsRecord::where('domain_id', $domainId)->get();
        
        return $this->successResponse([
            'domain' => $domain->domain,
            'records' => $records,
        ], "DNS records retrieved for zone: {$domain->domain}.");
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'domain_id' => 'required|exists:domains,id',
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:A,AAAA,CNAME,MX,TXT,NS,SRV,CAA',
            'value' => 'required|string',
            'ttl' => 'nullable|integer|min:60',
            'priority' => 'nullable|integer|min:0',
        ]);

        $record = DnsRecord::create([
            'domain_id' => $validated['domain_id'],
            'name' => $validated['name'],
            'type' => $validated['type'],
            'value' => $validated['value'],
            'ttl' => $validated['ttl'] ?? 3600,
            'priority' => $validated['priority'] ?? null,
        ]);

        // Sync zone to BIND
        (new DnsZoneSyncService())->syncZone($validated['domain_id']);

        return $this->successResponse($record, 'DNS record created successfully.', 201);
    }

    public function show($id)
    {
        $record = DnsRecord::with('domain')->find($id);

        if (!$record) {
            return $this->errorResponse('DNS record not found.', null, 404);
        }

        return $this->successResponse($record, 'DNS record details retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $record = DnsRecord::find($id);

        if (!$record) {
            return $this->errorResponse('DNS record not found.', null, 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'type' => 'nullable|string|in:A,AAAA,CNAME,MX,TXT,NS,SRV,CAA',
            'value' => 'nullable|string',
            'ttl' => 'nullable|integer|min:60',
            'priority' => 'nullable|integer|min:0',
        ]);

        $record->update($validated);

        // Sync zone to BIND
        (new DnsZoneSyncService())->syncZone($record->domain_id);

        return $this->successResponse($record, 'DNS record updated successfully.');
    }

    public function destroy($id)
    {
        $record = DnsRecord::find($id);

        if (!$record) {
            return $this->errorResponse('DNS record not found.', null, 404);
        }

        $domainIdForSync = $record->domain_id;
        $record->delete();

        // Sync zone to BIND
        (new DnsZoneSyncService())->syncZone($domainIdForSync);

        return $this->successResponse(null, 'DNS record deleted successfully.');
    }

    public function generateZoneFile($domainId)
    {
        $domain = Domain::with('hostingAccount')->findOrFail($domainId);
        $records = DnsRecord::where('domain_id', $domainId)->get();
        
        $ns1Raw = Setting::where('key', 'nameserver_1')->value('value')
            ?? Setting::where('key', 'ns1')->value('value')
            ?? 'ns1.node1.qiwhost.com';
        $ns2Raw = Setting::where('key', 'nameserver_2')->value('value')
            ?? Setting::where('key', 'ns2')->value('value')
            ?? 'ns2.node1.qiwhost.com';
        $ns1 = rtrim($ns1Raw, '.') . '.';
        $ns2 = rtrim($ns2Raw, '.') . '.';
        $adminEmail = 'admin.' . rtrim($domain->domain, '.') . '.';
        
        $serial = date('Ymd') . str_pad(rand(1, 99), 2, '0', STR_PAD_LEFT);
        
        $zoneFile = "; BIND Zone file for {$domain->domain}\n";
        $zoneFile .= "; Generated dynamically by QIWHOST Panel on " . date('Y-m-d H:i:s') . "\n\n";
        $zoneFile .= "\$TTL 3600\n";
        $zoneFile .= "@   IN  SOA {$ns1} {$adminEmail} (\n";
        $zoneFile .= "          {$serial} ; Serial\n";
        $zoneFile .= "          3600       ; Refresh\n";
        $zoneFile .= "          1800       ; Retry\n";
        $zoneFile .= "          604800     ; Expire\n";
        $zoneFile .= "          86400 )    ; Minimum TTL\n\n";
        
        $zoneFile .= "; Primary Nameservers\n";
        $zoneFile .= "@   IN  NS  {$ns1}\n";
        $zoneFile .= "@   IN  NS  {$ns2}\n\n";
        
        $zoneFile .= "; Zone Records\n";
        
        foreach ($records as $rec) {
            $nameStr = str_pad($rec->name, 15, ' ');
            $typeStr = str_pad($rec->type, 8, ' ');
            $priorityStr = $rec->priority !== null ? str_pad($rec->priority, 5, ' ') : '';
            
            // Format quotes for TXT
            $value = $rec->value;
            if ($rec->type === 'TXT' && !str_starts_with($value, '"')) {
                $value = '"' . $value . '"';
            }
            
            $zoneFile .= "{$nameStr} IN  {$typeStr} {$priorityStr}{$value}\n";
        }
        
        return $this->successResponse([
            'domain' => $domain->domain,
            'zone_file' => $zoneFile,
        ], 'BIND zone file compiled successfully.');
    }
}
