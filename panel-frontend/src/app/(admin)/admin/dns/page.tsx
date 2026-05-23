"use client";

import React, { useState, useEffect } from "react";
import { 
  Network, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Check, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileCode,
  Globe,
  Settings
} from "lucide-react";
import { AdminAPI as API } from "@/lib/api";

interface DnsZone {
  id: number;
  domain: string;
  owner: string;
  record_count: number;
  status: string;
}

interface DnsRecord {
  id: number;
  domain_id: number;
  name: string;
  type: string;
  value: string;
  ttl: number;
  priority: number | null;
}

export default function AdminDnsManager() {
  const [zones, setZones] = useState<DnsZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Expended zone state
  const [expandedZoneId, setExpandedZoneId] = useState<number | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<DnsRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Raw BIND Modal state
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindContent, setBindContent] = useState("");
  const [bindLoading, setBindLoading] = useState(false);
  const [bindDomainName, setBindDomainName] = useState("");

  // Record CRUD Form Modal State
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DnsRecord | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  const [activeDomainName, setActiveDomainName] = useState("");

  // Form Fields
  const [recName, setRecName] = useState("@");
  const [recType, setRecType] = useState("A");
  const [recValue, setRecValue] = useState("");
  const [recTtl, setRecTtl] = useState(3600);
  const [recPriority, setRecPriority] = useState<string>("");

  const fetchZones = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await API.get("/admin/dns", {
        params: searchQuery ? { search: searchQuery } : {}
      });
      if (res.data.success) {
        setZones(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to retrieve DNS zones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, [searchQuery]);

  const loadZoneRecords = async (zoneId: number) => {
    setLoadingRecords(true);
    try {
      const res = await API.get(`/admin/dns/zone/${zoneId}`);
      if (res.data.success) {
        setExpandedRecords(res.data.data.records);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to retrieve records for the selected zone.");
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleToggleExpand = async (zoneId: number) => {
    if (expandedZoneId === zoneId) {
      setExpandedZoneId(null);
      setExpandedRecords([]);
    } else {
      setExpandedZoneId(zoneId);
      await loadZoneRecords(zoneId);
    }
  };

  const handleOpenBindModal = async (zoneId: number, domainName: string) => {
    setBindDomainName(domainName);
    setBindContent("");
    setBindModalOpen(true);
    setBindLoading(true);
    try {
      const res = await API.get(`/admin/dns/${zoneId}/zone-file`);
      if (res.data.success) {
        setBindContent(res.data.data.zone_file);
      }
    } catch (err) {
      console.error(err);
      setBindContent("An error occurred trying to compile BIND zone output.");
    } finally {
      setBindLoading(false);
    }
  };

  const handleOpenCreateRecord = (zoneId: number, domainName: string) => {
    setEditingRecord(null);
    setActiveZoneId(zoneId);
    setActiveDomainName(domainName);
    setRecName("@");
    setRecType("A");
    setRecValue("");
    setRecTtl(3600);
    setRecPriority("");
    setFormModalOpen(true);
  };

  const handleOpenEditRecord = (record: DnsRecord, domainName: string) => {
    setEditingRecord(record);
    setActiveZoneId(record.domain_id);
    setActiveDomainName(domainName);
    setRecName(record.name);
    setRecType(record.type);
    setRecValue(record.value);
    setRecTtl(record.ttl);
    setRecPriority(record.priority !== null ? record.priority.toString() : "");
    setFormModalOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setFormModalOpen(false);

    const payload = {
      domain_id: activeZoneId,
      name: recName,
      type: recType,
      value: recValue,
      ttl: recTtl,
      priority: recPriority ? parseInt(recPriority, 10) : null
    };

    try {
      if (editingRecord) {
        // Update
        const res = await API.put(`/admin/dns/${editingRecord.id}`, payload);
        if (res.data.success) {
          setSuccessMsg("DNS record updated successfully!");
          if (expandedZoneId === activeZoneId) {
            loadZoneRecords(activeZoneId);
          }
          fetchZones();
        }
      } else {
        // Create
        const res = await API.post("/admin/dns", payload);
        if (res.data.success) {
          setSuccessMsg("DNS record created successfully!");
          if (expandedZoneId === activeZoneId) {
            loadZoneRecords(activeZoneId);
          }
          fetchZones();
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to persist DNS record changes.");
    } finally {
      setTimeout(() => {
        setSuccessMsg("");
        setErrorMsg("");
      }, 4000);
    }
  };

  const handleDeleteRecord = async (recordId: number, zoneId: number) => {
    if (!confirm("Are you sure you want to delete this DNS record?")) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await API.delete(`/admin/dns/${recordId}`);
      if (res.data.success) {
        setSuccessMsg("DNS record deleted successfully.");
        if (expandedZoneId === zoneId) {
          loadZoneRecords(zoneId);
        }
        fetchZones();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to delete DNS record.");
    } finally {
      setTimeout(() => {
        setSuccessMsg("");
        setErrorMsg("");
      }, 4000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Network className="w-7 h-7 text-primary" />
            Global DNS Zone Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage nameservers pointers, SPF/DKIM TXT entries, root A records, and download fully-formatted raw BIND zone configurations.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <Check className="w-5 h-5 text-green-600 bg-green-100 rounded-full p-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 bg-red-100 rounded-full p-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Control Row */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search active DNS zones or domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
          />
        </div>
      </div>

      {/* DNS Zones Table */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-gray-500">Querying DNS records from BIND index...</p>
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
          <Globe className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-800">No active DNS zones found</h3>
          <p className="text-sm text-gray-500 mt-1">
            Zones are automatically provisioned when customers register domains or deploy virtual hosts.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Domain Zone</th>
                <th className="px-6 py-4">Zone Owner</th>
                <th className="px-6 py-4">Total Entries</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {zones.map((zone) => {
                const isExpanded = expandedZoneId === zone.id;
                return (
                  <React.Fragment key={zone.id}>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-850 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        <span>{zone.domain}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-semibold">{zone.owner}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">{zone.record_count} Records</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          zone.status === "active" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                        }`}>
                          {zone.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenBindModal(zone.id, zone.domain)}
                          className="text-gray-600 hover:text-primary p-2 hover:bg-gray-100 rounded-lg transition-all"
                          title="View Raw BIND Zone File"
                        >
                          <FileCode className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => handleToggleExpand(zone.id)}
                          className="text-gray-600 hover:text-gray-850 p-2 hover:bg-gray-100 rounded-lg transition-all"
                        >
                          {isExpanded ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expandable row containing records CRUD */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50/70 p-6 border-t border-b border-gray-200">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                DNS Zone Records: {zone.domain}
                              </h4>
                              <button
                                onClick={() => handleOpenCreateRecord(zone.id, zone.domain)}
                                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Record</span>
                              </button>
                            </div>

                            {loadingRecords ? (
                              <div className="flex items-center justify-center p-6 space-x-2">
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                <span className="text-xs font-semibold text-gray-400">Fetching records from bind9...</span>
                              </div>
                            ) : expandedRecords.length === 0 ? (
                              <p className="text-xs text-gray-400 font-semibold italic text-center py-4">
                                No records mapped inside this zone. Click "Add Record" to seed one.
                              </p>
                            ) : (
                              <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200 font-bold text-gray-500 uppercase">
                                      <th className="px-4 py-3">Host Name</th>
                                      <th className="px-4 py-3">Type</th>
                                      <th className="px-4 py-3">Value</th>
                                      <th className="px-4 py-3">TTL</th>
                                      <th className="px-4 py-3">Priority</th>
                                      <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-150 font-semibold text-gray-800">
                                    {expandedRecords.map((rec) => (
                                      <tr key={rec.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2.5 font-mono">{rec.name}</td>
                                        <td className="px-4 py-2.5">
                                          <span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-[10px] text-gray-600 font-bold">
                                            {rec.type}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 font-mono max-w-xs truncate" title={rec.value}>
                                          {rec.value}
                                        </td>
                                        <td className="px-4 py-2.5">{rec.ttl}s</td>
                                        <td className="px-4 py-2.5">{rec.priority !== null ? rec.priority : "-"}</td>
                                        <td className="px-4 py-2.5 text-right space-x-1">
                                          <button
                                            onClick={() => handleOpenEditRecord(rec, zone.domain)}
                                            className="text-gray-500 hover:text-primary p-1.5 rounded hover:bg-gray-100 transition-all"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteRecord(rec.id, zone.id)}
                                            className="text-gray-500 hover:text-red-600 p-1.5 rounded hover:bg-gray-100 transition-all"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* BIND raw file compilation Modal */}
      {bindModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" />
                Raw BIND Zone Output: <span className="text-primary">{bindDomainName}</span>
              </h3>
              <button
                onClick={() => setBindModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 font-bold text-lg p-1.5 rounded-lg hover:bg-gray-100 transition-all"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow bg-gray-900 font-mono text-xs text-green-400 p-4 rounded-b-xl max-h-[60vh] select-text">
              {bindLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-green-500 font-medium font-semibold animate-pulse">Compiling BIND zone table records...</p>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{bindContent}</pre>
              )}
            </div>
            <div className="p-4 border-t border-gray-150 flex justify-end bg-gray-50">
              <button
                onClick={() => setBindModalOpen(false)}
                className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Creation & Edit Form Modal */}
      {formModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form onSubmit={handleSaveRecord} className="bg-white border border-gray-200 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-primary" />
                <span>{editingRecord ? "Edit DNS record" : "Add DNS record"} : {activeDomainName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Host Name</label>
                  <input
                    type="text"
                    required
                    value={recName}
                    onChange={(e) => setRecName(e.target.value)}
                    placeholder="e.g. @ or blog or www"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Record Type</label>
                  <select
                    value={recType}
                    onChange={(e) => setRecType(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  >
                    <option value="A">A (IPv4 Address)</option>
                    <option value="AAAA">AAAA (IPv6 Address)</option>
                    <option value="CNAME">CNAME (Canonical Name)</option>
                    <option value="MX">MX (Mail Exchanger)</option>
                    <option value="TXT">TXT (Text Record)</option>
                    <option value="NS">NS (Nameserver)</option>
                    <option value="SRV">SRV (Service Finder)</option>
                    <option value="CAA">CAA (Certificate Auth)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase block">IP / Value Address</label>
                <input
                  type="text"
                  required
                  value={recValue}
                  onChange={(e) => setRecValue(e.target.value)}
                  placeholder="e.g. 192.168.1.1 or v=spf1..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">TTL (Seconds)</label>
                  <input
                    type="number"
                    required
                    min={60}
                    value={recTtl}
                    onChange={(e) => setRecTtl(parseInt(e.target.value, 10))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Priority (Optional)</label>
                  <input
                    type="number"
                    disabled={recType !== "MX" && recType !== "SRV"}
                    value={recPriority}
                    onChange={(e) => setRecPriority(e.target.value)}
                    placeholder="e.g. 10 or 20"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-150 flex justify-end gap-2 bg-gray-50">
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary hover:bg-primary-hover text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md"
              >
                {editingRecord ? "Update Record" : "Create Record"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
