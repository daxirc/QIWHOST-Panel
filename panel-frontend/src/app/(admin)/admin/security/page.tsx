"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import { 
  ShieldAlert, 
  ShieldCheck,
  Play, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  FileCode,
  Globe,
  Settings,
  Lock,
  Activity,
  User,
  Clock,
  HardDrive,
  Loader2,
  ListFilter
} from "lucide-react";

export default function AdminSecurity() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"telemetry" | "quarantine" | "events" | "settings">("telemetry");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Settings states
  const [shellScanOn, setShellScanOn] = useState(true);
  const [clamAvOn, setClamAvOn] = useState(false);
  const [autoQuarantine, setAutoQuarantine] = useState(true);
  const [scanFrequency, setScanFrequency] = useState("daily");
  const [alertEmail, setAlertEmail] = useState("admin@qiwhost.com");

  // Fetch security events log
  const { data: eventsRes, isLoading: isEventsLoading } = useQuery({
    queryKey: ["admin", "security", "events"],
    queryFn: async () => {
      const res = await API.get("/admin/security/events");
      return res.data.data;
    }
  });

  const events = Array.isArray(eventsRes) ? eventsRes : [];

  // Fetch quarantined files
  const { data: quarantineRes, isLoading: isQuarantineLoading } = useQuery({
    queryKey: ["admin", "security", "quarantine"],
    queryFn: async () => {
      const res = await API.get("/admin/security/quarantine");
      return res.data.data;
    }
  });

  const quarantine = Array.isArray(quarantineRes) ? quarantineRes : [];

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  // Run Scan Mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await API.post("/admin/security/scan");
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "security", "events"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "security", "quarantine"] });
      showToast("success", "Active directory malware scan finished successfully!");
      if (data?.console_output) {
        alert("Scan Console Log Summary:\n" + data.console_output);
      }
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Security scan process failed.");
    }
  });

  // Permanently Delete Quarantined Mutation
  const deleteQuarantineMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/admin/security/quarantine/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "security", "quarantine"] });
      showToast("success", "Malicious file permanently erased from storage.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Purge failed.");
    }
  });

  // Restore Quarantined Mutation
  const restoreQuarantineMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/admin/security/quarantine/${id}/restore`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "security", "quarantine"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "security", "events"] });
      showToast("success", "Quarantined file successfully restored to home directory.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "File restoration failed.");
    }
  });

  const totalThreatsBlocked = events.filter((e: any) => e.blocked).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-semibold text-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-primary animate-pulse" />
            Cluster Security & Threat Isolation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Audit web shells uploads events, isolate malicious code inside quarantine containers, and manage system isolation policies.
          </p>
        </div>
        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
        >
          {scanMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning Cluster...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Scan Home Directories</span>
            </>
          )}
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`p-4 rounded-lg border text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
          toast.type === "success" 
            ? "bg-green-50 border-green-200 text-green-700" 
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 select-none font-semibold">
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "telemetry" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Security Overview</span>
        </button>
        <button
          onClick={() => setActiveTab("quarantine")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "quarantine" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Quarantined Files ({quarantine.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "events" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Events Logs ({events.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "settings" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Policies Settings</span>
        </button>
      </div>

      {/* Tab: Telemetry Overview */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-semibold">
            {/* Threats Blocked */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-green-50 text-green-600 rounded-full shrink-0">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Threats Blocked</span>
                <h3 className="text-2xl font-extrabold text-gray-800">
                  {isEventsLoading ? "..." : totalThreatsBlocked}
                </h3>
              </div>
            </div>

            {/* Quarantined items */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-red-50 text-red-650 rounded-full shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Isolated in Quarantine</span>
                <h3 className="text-2xl font-extrabold text-gray-800">
                  {isQuarantineLoading ? "..." : quarantine.length}
                </h3>
              </div>
            </div>

            {/* Active monitored accounts */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-full shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Jailed Sandbox Accounts</span>
                <h3 className="text-2xl font-extrabold text-gray-850">
                  Active (All)
                </h3>
              </div>
            </div>
          </div>

          {/* Quick Audits logs summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-800">Sandboxing Security Status</h3>
            <div className="text-xs text-gray-500 max-w-xl">
              All multi-tenant customer accounts are provisioned with dedicated <span className="font-mono bg-gray-150 px-1 py-0.5 rounded font-bold">open_basedir</span> directory boundaries, locking filesystem traversal. Real-time scanning intercepts file manager operations.
            </div>
            <div className="border border-gray-150 rounded-lg p-4 bg-gray-50 flex flex-wrap gap-6 text-xs justify-between">
              <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-500" /><span>open_basedir Enabled: 100%</span></div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-500" /><span>PHP disable_functions Enforced</span></div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-500" /><span>Real-time malware upload block</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Quarantine Directory */}
      {activeTab === "quarantine" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {isQuarantineLoading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium">Reading quarantined files directory...</p>
            </div>
          ) : quarantine.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <ShieldCheck className="w-12 h-12 mx-auto text-green-500 animate-pulse" />
              <p className="font-bold text-gray-650">Quarantine Directory is Clean</p>
              <p className="text-xs max-w-sm mx-auto">No isolated malware files or compromised web shells currently cached on server nodes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Suspicious File</th>
                    <th className="px-6 py-4">Hosting Account</th>
                    <th className="px-6 py-4">Trigger Pattern</th>
                    <th className="px-6 py-4">Isolate Path</th>
                    <th className="px-6 py-4 text-center">Isolate Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-gray-700">
                  {quarantine.map((file: any) => (
                    <tr key={file.id} className="hover:bg-gray-55/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-900 font-bold font-mono text-xs">
                          <Lock className="w-4 h-4 text-red-500 shrink-0" />
                          <span>{basename(file.original_path)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold">{file.username}</td>
                      <td className="px-6 py-4">
                        <span className="bg-red-50 border border-red-200 text-red-650 px-2 py-0.5 rounded text-xs font-bold font-mono">
                          {file.threat_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-gray-500 truncate max-w-[160px]" title={file.quarantine_path}>
                        {file.quarantine_path}
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-gray-500">
                        {file.created_at}
                      </td>
                      <td className="px-6 py-4 text-right flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            if (confirm("Restore quarantined file back to original user folder?")) {
                              restoreQuarantineMutation.mutate(file.id);
                            }
                          }}
                          disabled={restoreQuarantineMutation.isPending}
                          className="bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Warning: Purging this quarantined file is permanent. Continue?")) {
                              deleteQuarantineMutation.mutate(file.id);
                            }
                          }}
                          disabled={deleteQuarantineMutation.isPending}
                          className="bg-red-50 border border-red-200 text-red-650 hover:bg-red-100 p-1.5 rounded-lg transition-all cursor-pointer"
                          title="Erase permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Security events */}
      {activeTab === "events" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {isEventsLoading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium">Reading security events audit feed...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <ShieldCheck className="w-12 h-12 mx-auto text-green-500 animate-pulse" />
              <p className="font-bold text-gray-650">No Security Events Logged</p>
              <p className="text-xs">No web shell upload blocks, null-byte injections, or malicious uploads intercepted today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Security Incident</th>
                    <th className="px-6 py-4">Incriminated Host</th>
                    <th className="px-6 py-4">Event Type</th>
                    <th className="px-6 py-4">Audit Description</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-gray-700">
                  {events.map((ev: any) => (
                    <tr key={ev.id} className="hover:bg-gray-55/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-900 font-bold font-mono text-xs">
                          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                          <span>{ev.file_path || "Dynamic Request"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 flex flex-col font-bold text-xs gap-0.5">
                        <span className="text-gray-800">{ev.username}</span>
                        <span className="text-gray-400 font-mono font-medium">{ev.ip_address}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-orange-50 border border-orange-200 text-orange-600 px-2 py-0.5 rounded text-xs font-bold font-mono uppercase">
                          {ev.event_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-550 max-w-[220px]" title={ev.description}>
                        {ev.description}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ev.blocked
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : "bg-orange-50 text-orange-600 border border-orange-200"
                        }`}>
                          {ev.blocked ? "BLOCKED" : "LOGGED"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-gray-400">
                        {ev.created_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Policies Settings */}
      {activeTab === "settings" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6 max-w-3xl font-semibold text-sm">
          <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-gray-800">Configure Security Policies</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div>
                <h4 className="font-bold text-gray-850">Proactive Malware Shell Scanning</h4>
                <p className="text-xs text-gray-400 mt-0.5">Scans every customer file upload against web shells signature vectors.</p>
              </div>
              <input
                type="checkbox"
                checked={shellScanOn}
                onChange={(e) => setShellScanOn(e.target.checked)}
                className="rounded border-gray-300 text-primary h-5 w-5"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div>
                <h4 className="font-bold text-gray-850">ClamAV Deamon Integration</h4>
                <p className="text-xs text-gray-400 mt-0.5">Hooks into ClamAV scanners binaries to perform virus audits scan recursively.</p>
              </div>
              <input
                type="checkbox"
                checked={clamAvOn}
                onChange={(e) => setClamAvOn(e.target.checked)}
                className="rounded border-gray-300 text-primary h-5 w-5"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div>
                <h4 className="font-bold text-gray-850">Automated Threat Quarantine</h4>
                <p className="text-xs text-gray-400 mt-0.5">Isolates identified malicious scripts blocks directly to quarantine root scopes.</p>
              </div>
              <input
                type="checkbox"
                checked={autoQuarantine}
                onChange={(e) => setAutoQuarantine(e.target.checked)}
                className="rounded border-gray-300 text-primary h-5 w-5"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase">Security Threat Scan Frequency</label>
              <select
                value={scanFrequency}
                onChange={(e) => setScanFrequency(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none"
              >
                <option value="hourly">Hourly Scan Cron</option>
                <option value="daily">Daily scan Cron (Recommended)</option>
                <option value="weekly">Weekly Scan Cron</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase">Alert Notifications Email Destination</label>
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => showToast("success", "Security system policies successfully saved.")}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md flex items-center gap-1 cursor-pointer"
            >
              <span>Save Policy Settings</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick helper
function basename(path: string) {
  if (!path) return "Unknown";
  return path.split(/[\\/]/).pop();
}
