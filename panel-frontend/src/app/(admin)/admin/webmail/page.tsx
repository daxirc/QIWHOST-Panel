"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import { 
  Mail, 
  Settings, 
  Terminal, 
  ShieldCheck, 
  Activity, 
  Database, 
  Loader2, 
  Check, 
  AlertTriangle,
  Play,
  CheckCircle,
  XCircle,
  ExternalLink,
  Layers
} from "lucide-react";

export default function AdminWebmail() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"telemetry" | "config" | "test" | "plugins">("telemetry");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getWebmailUrl = () => {
    if (typeof window !== "undefined") {
      return `http://${window.location.hostname}:8025`;
    }
    const host = process.env.NEXT_PUBLIC_SERVER_IP || "127.0.0.1";
    return `http://${host}:8025`;
  };

  const webmailUrl = getWebmailUrl();

  // Connection Test Form State
  const [testImapHost, setTestImapHost] = useState("localhost");
  const [testImapPort, setTestImapPort] = useState(993);
  const [testSmtpHost, setTestSmtpHost] = useState("localhost");
  const [testSmtpPort, setTestSmtpPort] = useState(587);
  const [testResults, setTestResults] = useState<any>(null);

  // Configuration Form State
  const [configForm, setConfigForm] = useState({
    imap_host: "localhost",
    imap_port: "993",
    smtp_host: "localhost",
    smtp_port: "587",
    product_name: "QIWHOST Webmail",
    default_language: "en_US",
    max_message_size_mb: "25",
    session_lifetime_min: "10",
  });

  // Query Roundcube Status
  const { data: statusRes, isLoading: isStatusLoading } = useQuery({
    queryKey: ["admin", "webmail", "status"],
    queryFn: async () => {
      const res = await API.get("/admin/webmail/status");
      return res.data.data;
    }
  });

  // Query Roundcube Configuration
  const { data: configRes, isLoading: isConfigLoading } = useQuery({
    queryKey: ["admin", "webmail", "config"],
    queryFn: async () => {
      const res = await API.get("/admin/webmail/config");
      const data = res.data.data;
      setConfigForm({
        imap_host: data.imap_host || "localhost",
        imap_port: data.imap_port || "993",
        smtp_host: data.smtp_host || "localhost",
        smtp_port: data.smtp_port || "587",
        product_name: data.product_name || "QIWHOST Webmail",
        default_language: data.default_language || "en_US",
        max_message_size_mb: data.max_message_size_mb || "25",
        session_lifetime_min: data.session_lifetime_min || "10",
      });
      return data;
    }
  });

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  // Install Roundcube Mutation
  const installMutation = useMutation({
    mutationFn: async () => {
      const res = await API.post("/admin/webmail/install");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "webmail", "status"] });
      showToast("success", "Roundcube installation triggered and configured successfully!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Roundcube installation failed.");
    }
  });

  // Update Config Mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/admin/webmail/config", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "webmail", "config"] });
      showToast("success", "Roundcube configurations updated successfully.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to update configurations.");
    }
  });

  // Test Sockets Mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/admin/webmail/test-connection", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      setTestResults(data);
      if (data.imap_status === "connected" && data.smtp_status === "connected") {
        showToast("success", "SMTP and IMAP connection sockets validated successfully!");
      } else {
        showToast("error", "One or more socket connections failed.");
      }
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Diagnostic test failed.");
    }
  });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigMutation.mutate(configForm);
  };

  const handleTestConnection = (e: React.FormEvent) => {
    e.preventDefault();
    setTestResults(null);
    testConnectionMutation.mutate({
      imap_host: testImapHost,
      imap_port: testImapPort,
      smtp_host: testSmtpHost,
      smtp_port: testSmtpPort
    });
  };

  const handleTogglePlugin = (pluginKey: string, currentValue: string) => {
    const nextValue = currentValue === "1" ? "0" : "1";
    const payload = {
      ...configRes,
      [pluginKey]: nextValue
    };
    updateConfigMutation.mutate(payload);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Mail className="w-7 h-7 text-primary" />
            Roundcube Webmail Administration
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor IMAP/SMTP mail servers, provision mailbox assets, manage plugin settings, and test active connection daemon ports.
          </p>
        </div>
        {statusRes?.installed && (
          <a
            href={webmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all text-sm"
          >
            <span>Open Webmail Portal</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === "telemetry"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Status & Telemetry</span>
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === "config"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Mail Settings</span>
        </button>
        <button
          onClick={() => setActiveTab("test")}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === "test"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Port Diagnostics</span>
        </button>
        <button
          onClick={() => setActiveTab("plugins")}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === "plugins"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Roundcube Plugins</span>
        </button>
      </div>

      {activeTab === "telemetry" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Service Status
              </h3>
              {isStatusLoading ? (
                <span className="text-xs text-gray-400 font-semibold animate-pulse">Checking status...</span>
              ) : statusRes?.installed ? (
                <span className="bg-green-50 text-green-600 border border-green-200 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                  <span>Active & Provisioned</span>
                </span>
              ) : (
                <span className="bg-red-50 text-red-650 border border-red-200 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                  Not Installed
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3 font-semibold text-gray-600">
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400">Daemon Version</span>
                  <span className="text-gray-800 font-bold">{statusRes?.version || "Roundcube 1.6.6"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400">Root Directory</span>
                  <span className="text-gray-800 font-mono text-xs">{statusRes?.path || "/usr/local/lsws/roundcube"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">HTTP Proxy path</span>
                  <span className="text-primary font-bold">/webmail</span>
                </div>
              </div>

              <div className="space-y-3 font-semibold text-gray-600">
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400">SMTP Server Host</span>
                  <span className="text-gray-800">{statusRes?.smtp_server || "localhost"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400">SMTP Port</span>
                  <span className="text-gray-800 font-mono">{statusRes?.smtp_port || "587"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">IMAP Server Host</span>
                  <span className="text-gray-800">{statusRes?.imap_server || "localhost"}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
              <button
                onClick={() => installMutation.mutate()}
                disabled={installMutation.isPending}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md flex items-center gap-1.5 transition-all"
              >
                {installMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Running Installer...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>{statusRes?.installed ? "Reinstall & Reconfigure" : "Install Roundcube"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats Sidebar */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 lg:col-span-1 h-fit">
            <h3 className="font-bold text-gray-800">Cluster Status</h3>
            <div className="space-y-2 text-xs font-semibold text-gray-600">
              <div className="flex justify-between py-1.5 border-b border-gray-55">
                <span>Postfix Daemon</span>
                <span className="text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  <span>Active</span>
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-55">
                <span>Dovecot Daemon</span>
                <span className="text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  <span>Active</span>
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Database engine</span>
                <span className="text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  <span>MariaDB</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "config" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6 max-w-3xl">
          <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-gray-800">Configure Mail Parameters</h3>
          </div>

          {isConfigLoading ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span>Fetching configuration mapping...</span>
            </div>
          ) : (
            <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm font-semibold">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">Product Brand Name</label>
                <input
                  type="text"
                  value={configForm.product_name}
                  onChange={(e) => setConfigForm({ ...configForm, product_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">Session Lifetime (Minutes)</label>
                <input
                  type="number"
                  value={configForm.session_lifetime_min}
                  onChange={(e) => setConfigForm({ ...configForm, session_lifetime_min: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">IMAP Server Host</label>
                <input
                  type="text"
                  value={configForm.imap_host}
                  onChange={(e) => setConfigForm({ ...configForm, imap_host: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">IMAP SSL Port</label>
                <input
                  type="number"
                  value={configForm.imap_port}
                  onChange={(e) => setConfigForm({ ...configForm, imap_port: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">SMTP Server Host</label>
                <input
                  type="text"
                  value={configForm.smtp_host}
                  onChange={(e) => setConfigForm({ ...configForm, smtp_host: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">SMTP STARTTLS Port</label>
                <input
                  type="number"
                  value={configForm.smtp_port}
                  onChange={(e) => setConfigForm({ ...configForm, smtp_port: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">Max Message Size (MB)</label>
                <input
                  type="number"
                  value={configForm.max_message_size_mb}
                  onChange={(e) => setConfigForm({ ...configForm, max_message_size_mb: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">Default Language</label>
                <select
                  value={configForm.default_language}
                  onChange={(e) => setConfigForm({ ...configForm, default_language: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="en_US">English (US)</option>
                  <option value="es_ES">Spanish</option>
                  <option value="de_DE">German</option>
                  <option value="fr_FR">French</option>
                </select>
              </div>

              <div className="md:col-span-2 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={updateConfigMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-5 py-2 rounded-lg shadow-md flex items-center gap-1.5 transition-all"
                >
                  {updateConfigMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving settings...</span>
                    </>
                  ) : (
                    <span>Save Settings</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === "test" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Diagnostic Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 lg:col-span-1 h-fit text-sm font-semibold">
            <h3 className="font-bold text-gray-850">Diagnostic Tool</h3>
            <form onSubmit={handleTestConnection} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">IMAP Host</label>
                <input
                  type="text"
                  value={testImapHost}
                  onChange={(e) => setTestImapHost(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">IMAP Port</label>
                <input
                  type="number"
                  value={testImapPort}
                  onChange={(e) => setTestImapPort(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">SMTP Host</label>
                <input
                  type="text"
                  value={testSmtpHost}
                  onChange={(e) => setTestSmtpHost(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">SMTP Port</label>
                <input
                  type="number"
                  value={testSmtpPort}
                  onChange={(e) => setTestSmtpPort(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={testConnectionMutation.isPending}
                className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-lg shadow-md font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Testing Sockets...</span>
                  </>
                ) : (
                  <span>Run Connection Diagnostic</span>
                )}
              </button>
            </form>
          </div>

          {/* Results Console */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 lg:col-span-2">
            <h3 className="font-bold text-gray-800">Diagnostic Results</h3>
            {testResults ? (
              <div className="space-y-4 font-semibold text-sm">
                <div className={`p-4 rounded-lg border flex gap-3 items-start ${
                  testResults.imap_status === "connected" && testResults.smtp_status === "connected"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  {testResults.imap_status === "connected" && testResults.smtp_status === "connected" ? (
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">Diagnostic Telemetry Summary</h4>
                    <p className="text-xs mt-1 leading-relaxed">{testResults.message}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-150 rounded-lg p-4 space-y-1">
                    <span className="text-xs text-gray-400 uppercase">IMAP socket status</span>
                    <div className="flex items-center gap-2 pt-1 font-bold">
                      {testResults.imap_status === "connected" ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 uppercase">CONNECTED</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-red-650 uppercase">FAILED</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border border-gray-150 rounded-lg p-4 space-y-1">
                    <span className="text-xs text-gray-400 uppercase">SMTP socket status</span>
                    <div className="flex items-center gap-2 pt-1 font-bold">
                      {testResults.smtp_status === "connected" ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 uppercase">CONNECTED</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-red-650 uppercase">FAILED</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 gap-1 font-semibold text-sm">
                <Terminal className="w-10 h-10 text-gray-300" />
                <span>Run diagnostic port scan above to fetch sockets status logs.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "plugins" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-gray-150 pb-3">
            <h3 className="font-bold text-gray-800">Manage Roundcube Plugin Extensions</h3>
            <p className="text-xs text-gray-500 mt-1">Enable or disable product extensions directly compiled in config templates.</p>
          </div>

          {isConfigLoading ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span>Fetching plugins mapping...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-semibold text-sm">
              {/* Plugin card 1 */}
              <div className="border border-gray-150 rounded-xl p-4 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-850">Zipdownload</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Enables the download of multiple attachments bundled as a single zip archive.</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs uppercase font-bold ${configRes?.plugin_zipdownload === "1" ? "text-green-600" : "text-gray-400"}`}>
                    {configRes?.plugin_zipdownload === "1" ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    onClick={() => handleTogglePlugin("plugin_zipdownload", configRes?.plugin_zipdownload || "0")}
                    disabled={updateConfigMutation.isPending}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      configRes?.plugin_zipdownload === "1"
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                    }`}
                  >
                    {configRes?.plugin_zipdownload === "1" ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>

              {/* Plugin card 2 */}
              <div className="border border-gray-150 rounded-xl p-4 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-850">CardDAV Addresses Sync</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Allows carddav contact calendars syncing with webmail directories.</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs uppercase font-bold ${configRes?.plugin_carddav === "1" ? "text-green-600" : "text-gray-400"}`}>
                    {configRes?.plugin_carddav === "1" ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    onClick={() => handleTogglePlugin("plugin_carddav", configRes?.plugin_carddav || "0")}
                    disabled={updateConfigMutation.isPending}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      configRes?.plugin_carddav === "1"
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                    }`}
                  >
                    {configRes?.plugin_carddav === "1" ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>

              {/* Plugin card 3 */}
              <div className="border border-gray-150 rounded-xl p-4 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-850">Password Changer</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Integrates mailbox database password change directly inside settings preferences panel.</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs uppercase font-bold ${configRes?.plugin_password === "1" ? "text-green-600" : "text-gray-400"}`}>
                    {configRes?.plugin_password === "1" ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    onClick={() => handleTogglePlugin("plugin_password", configRes?.plugin_password || "0")}
                    disabled={updateConfigMutation.isPending}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      configRes?.plugin_password === "1"
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                    }`}
                  >
                    {configRes?.plugin_password === "1" ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>

              {/* Plugin card 4 */}
              <div className="border border-gray-150 rounded-xl p-4 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-850">Managesieve</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Enables remote managing of sieve server email filtering templates rules.</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs uppercase font-bold ${configRes?.plugin_managesieve === "1" ? "text-green-600" : "text-gray-400"}`}>
                    {configRes?.plugin_managesieve === "1" ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    onClick={() => handleTogglePlugin("plugin_managesieve", configRes?.plugin_managesieve || "0")}
                    disabled={updateConfigMutation.isPending}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      configRes?.plugin_managesieve === "1"
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                    }`}
                  >
                    {configRes?.plugin_managesieve === "1" ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>

              {/* Plugin card 5 */}
              <div className="border border-gray-150 rounded-xl p-4 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-850">Archive</h4>
                  <p className="text-xs text-gray-550 mt-1 leading-relaxed">Integrates quick hotkey and context menu options to archive specific messages instantly.</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs uppercase font-bold ${configRes?.plugin_archive === "1" ? "text-green-600" : "text-gray-400"}`}>
                    {configRes?.plugin_archive === "1" ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    onClick={() => handleTogglePlugin("plugin_archive", configRes?.plugin_archive || "0")}
                    disabled={updateConfigMutation.isPending}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      configRes?.plugin_archive === "1"
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                    }`}
                  >
                    {configRes?.plugin_archive === "1" ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
