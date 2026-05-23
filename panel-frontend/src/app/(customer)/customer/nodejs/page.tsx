"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  Cpu, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Layers, 
  Settings, 
  ShieldCheck, 
  Activity, 
  Folder, 
  RefreshCw, 
  Lock, 
  Play,
  Square,
  Terminal,
  Globe,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Code
} from "lucide-react";

export default function CustomerNodeJs() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Installer Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [nodeVersion, setNodeVersion] = useState("20");
  const [startupFile, setStartupFile] = useState("index.js");
  const [port, setPort] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [gitRepo, setGitRepo] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [autoRestart, setAutoRestart] = useState(true);

  // Logs Console State
  const [activeLogApp, setActiveLogApp] = useState<any>(null);

  // Fetch client Node.js applications
  const { data: appsRes, isLoading: isAppsLoading } = useQuery({
    queryKey: ["customer", "nodejs", "list"],
    queryFn: async () => {
      const res = await API.get("/customer/nodejs");
      return res.data.data;
    }
  });

  const apps = Array.isArray(appsRes) ? appsRes : [];

  // Fetch customer domains
  const { data: domainsRes } = useQuery({
    queryKey: ["customer", "domains", "list"],
    queryFn: async () => {
      const res = await API.get("/customer/domains");
      return res.data.data;
    }
  });

  const domains = Array.isArray(domainsRes) ? domainsRes : [];

  // Fetch PM2 Logs
  const { data: logsRes, isLoading: isLogsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["customer", "nodejs", activeLogApp?.id, "logs"],
    queryFn: async () => {
      if (!activeLogApp?.id) return [];
      const res = await API.get(`/customer/nodejs/${activeLogApp.id}/logs`);
      return res.data.data;
    },
    enabled: !!activeLogApp?.id,
    refetchInterval: 3000 // auto-refresh console every 3s
  });

  const logs = Array.isArray(logsRes) ? logsRes : [];

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  // Suggest random free port
  const handleSuggestPort = () => {
    const min = 3000;
    const max = 20000;
    const randPort = Math.floor(Math.random() * (max - min + 1)) + min;
    setPort(randPort.toString());
  };

  // Create App Mutation
  const createAppMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/nodejs", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "nodejs", "list"] });
      setIsCreateOpen(false);
      setAppName("");
      setSelectedDomainId("");
      setPort("");
      setGitRepo("");
      setGitBranch("main");
      setStartupFile("index.js");
      showToast("success", "Node.js application provisioned and launched!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to provision Node.js application.");
    }
  });

  // Start App Mutation
  const startMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/customer/nodejs/${id}/start`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "nodejs", "list"] });
      showToast("success", "PM2 runner process started successfully.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to start application daemon.");
    }
  });

  // Stop App Mutation
  const stopMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/customer/nodejs/${id}/stop`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "nodejs", "list"] });
      showToast("success", "PM2 process halted.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to stop application.");
    }
  });

  // Restart App Mutation
  const restartMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/customer/nodejs/${id}/restart`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "nodejs", "list"] });
      showToast("success", "Application successfully restarted.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to restart application.");
    }
  });

  // Git Deploy Mutation
  const gitDeployMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/customer/nodejs/${id}/git-deploy`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "nodejs", "list"] });
      showToast("success", "Git code pulled, packages compiled, and PM2 process re-loaded.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Git deployment failed.");
    }
  });

  // Delete App Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/customer/nodejs/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "nodejs", "list"] });
      showToast("success", "Node.js application deleted.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to purge application.");
    }
  });

  const handleCreateApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName || !selectedDomainId || !port || !startupFile) {
      showToast("error", "Please fill in all app configuration fields.");
      return;
    }
    createAppMutation.mutate({
      name: appName,
      domain_id: selectedDomainId,
      port: Number(port),
      startup_file: startupFile,
      node_version: nodeVersion,
      environment,
      git_repo: gitRepo || null,
      git_branch: gitBranch,
      auto_restart: autoRestart
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-semibold text-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Cpu className="w-7 h-7 text-primary" />
            Node.js Hosting Engine
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Deploy production-grade Node.js servers, bind environment configurations, pull latest code from Git, and review logs via PM2 runner processes.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Deploy Node.js App</span>
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

      {/* Applications Directory Grid */}
      {isAppsLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-gray-500">Scanning container environment for Node daemons...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-350 rounded-xl p-12 text-center max-w-xl mx-auto space-y-4">
          <Cpu className="w-12 h-12 mx-auto text-gray-300 animate-pulse" />
          <h3 className="text-lg font-bold text-gray-700">No Node.js Servers Registered</h3>
          <p className="text-xs text-gray-550 leading-relaxed">
            Deploy full express, nest, or custom node servers under jailed process spaces. The system sets up dynamic reverse proxy mapping, binds ports, and compiles packages automatically.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md inline-flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Deployer Wizard</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {apps.map((app: any) => (
            <div key={app.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between gap-5 transition-all hover:shadow-md">
              
              {/* App Meta */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Code className="w-5 h-5 text-primary" />
                      <span>{app.name}</span>
                    </h3>
                    <p className="text-xs text-gray-400 font-mono mt-1 font-semibold flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span>{app.domain?.domain}</span>
                    </p>
                  </div>

                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm flex items-center gap-1.5 ${
                    app.status === "running"
                      ? "bg-green-50 text-green-600 border border-green-200"
                      : app.status === "error"
                      ? "bg-red-50 text-red-600 border border-red-200"
                      : "bg-gray-50 text-gray-600 border border-gray-200"
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      app.status === "running"
                        ? "bg-green-500 animate-ping"
                        : app.status === "error"
                        ? "bg-red-500"
                        : "bg-gray-400"
                    }`}></span>
                    <span className="capitalize">{app.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-600 pt-1 border-t border-gray-50">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400">Node.js Engine</span>
                    <span className="text-gray-800 font-bold">v{app.node_version} LTS</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400">Bound Port</span>
                    <span className="text-gray-800 font-mono font-bold">{app.port}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400">Environment</span>
                    <span className="text-gray-800 capitalize font-bold">{app.environment}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400">Startup File</span>
                    <span className="text-gray-800 font-mono">{app.startup_file}</span>
                  </div>
                </div>

                {app.git_repo && (
                  <div className="bg-gray-50 border border-gray-150 rounded-lg p-2 flex items-center justify-between text-xs font-mono">
                    <div className="truncate text-gray-500 max-w-[200px]" title={app.git_repo}>
                      {app.git_repo}
                    </div>
                    <span className="text-primary font-bold">[{app.git_branch}]</span>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2 text-xs">
                {app.status === "running" ? (
                  <button
                    onClick={() => stopMutation.mutate(app.id)}
                    disabled={stopMutation.isPending}
                    className="bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-gray-700" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startMutation.mutate(app.id)}
                    disabled={startMutation.isPending}
                    className="bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-primary" />
                    <span>Start</span>
                  </button>
                )}

                <button
                  onClick={() => restartMutation.mutate(app.id)}
                  disabled={restartMutation.isPending}
                  className="bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>

                <button
                  onClick={() => setActiveLogApp(app)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Console Logs</span>
                </button>

                {app.git_repo && (
                  <button
                    onClick={() => {
                      if (confirm("Pull latest changes from Git and restart server process?")) {
                        gitDeployMutation.mutate(app.id);
                      }
                    }}
                    disabled={gitDeployMutation.isPending}
                    className="bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{gitDeployMutation.isPending ? "Deploying..." : "Git Deploy"}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (confirm("Warning: Deleting this app will stop PM2 processes, purge proxy mappings, and clean folder. Proceed?")) {
                      deleteMutation.mutate(app.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="bg-red-50 border border-red-200 text-red-650 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ml-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Deployment Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-semibold">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                Deploy Node.js Server
              </h2>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateApp} className="p-6 space-y-4 text-sm font-semibold">
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 block uppercase">Application Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. my-express-api"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 block uppercase">Map to Domain</label>
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none"
                  required
                >
                  <option value="">-- Select Active Domain --</option>
                  {domains.map((dom: any) => (
                    <option key={dom.id} value={dom.id}>{dom.domain}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 block uppercase">Node.js Version</label>
                  <select
                    value={nodeVersion}
                    onChange={(e) => setNodeVersion(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none"
                  >
                    <option value="18">Node.js 18 LTS</option>
                    <option value="20">Node.js 20 LTS</option>
                    <option value="22">Node.js 22 Current</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-550 block uppercase">Startup script hook</label>
                  <input
                    type="text"
                    required
                    placeholder="index.js"
                    value={startupFile}
                    onChange={(e) => setStartupFile(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 block uppercase flex items-center justify-between">
                    <span>Daemon Port</span>
                    <button
                      type="button"
                      onClick={handleSuggestPort}
                      className="text-primary hover:underline text-[10px] font-bold"
                    >
                      Suggest Port
                    </button>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="3000-65535"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 block uppercase">Environment</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none"
                  >
                    <option value="production">Production</option>
                    <option value="development">Development</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 block uppercase">Git Repository URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/user/repo"
                  value={gitRepo}
                  onChange={(e) => setGitRepo(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 block uppercase">Git Branch</label>
                  <input
                    type="text"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="auto_restart"
                    checked={autoRestart}
                    onChange={(e) => setAutoRestart(e.target.checked)}
                    className="rounded border-gray-300 text-primary h-4.5 w-4.5"
                  />
                  <label htmlFor="auto_restart" className="text-xs text-gray-700 select-none uppercase font-bold">
                    Auto Restart
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAppMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg shadow-md flex items-center gap-2 transition-all font-bold cursor-pointer"
                >
                  {createAppMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Compiling packages...</span>
                    </>
                  ) : (
                    <span>Deploy Application</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs Console Drawer */}
      {activeLogApp && (
        <div className="fixed inset-y-0 right-0 z-50 max-w-xl w-full bg-gray-900 text-gray-100 shadow-2xl flex flex-col animate-in slide-in-from-right duration-350">
          <div className="px-6 py-5 border-b border-gray-850 bg-gray-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-green-400 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm text-gray-100">{activeLogApp.name} logs</h3>
                <span className="text-[10px] text-gray-400 font-semibold font-mono">Bound IP: 127.0.0.1:{activeLogApp.port}</span>
              </div>
            </div>
            <button 
              onClick={() => setActiveLogApp(null)}
              className="text-gray-400 hover:text-gray-200 font-bold bg-white/5 hover:bg-white/10 p-2 rounded-lg"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto font-mono text-xs space-y-1.5 bg-black scrollbar-thin scrollbar-thumb-gray-800">
            {isLogsLoading ? (
              <p className="text-gray-500 animate-pulse">Streaming server process stdio logs streams...</p>
            ) : (
              logs.map((log: string, idx: number) => {
                const isError = log.toLowerCase().includes("error") || log.toLowerCase().includes("err!") || log.toLowerCase().includes("failed");
                return (
                  <div key={idx} className={`leading-relaxed whitespace-pre-wrap ${isError ? "text-red-400" : "text-green-400"}`}>
                    {log}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-6 py-4 bg-gray-950 border-t border-gray-850 flex items-center justify-between">
            <button
              onClick={() => refetchLogs()}
              className="text-xs font-bold text-gray-400 hover:text-gray-200 flex items-center gap-1.5 cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Log Slices</span>
            </button>
            <span className="text-[10px] text-gray-550">PM2 auto-refresh: 3s</span>
          </div>
        </div>
      )}
    </div>
  );
}
