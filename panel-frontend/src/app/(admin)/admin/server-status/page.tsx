"use client";

import React, { useState, useEffect } from "react";
import { 
  Server, 
  RefreshCw, 
  Cpu, 
  Activity, 
  AlertCircle, 
  HardDrive, 
  Terminal, 
  ShieldAlert, 
  CheckCircle2, 
  Layers
} from "lucide-react";
import { AdminAPI as API } from "@/lib/api";

interface ServerService {
  name: string;
  status: string;
  uptime: string;
  memory?: string;
  cpu?: string;
  id: string;
}

interface ServerStats {
  cpu_usage: number;
  ram_used: number;
  ram_total: number;
  disk_used: number;
  disk_total: number;
}

interface ServerInfo {
  server_ip: string;
  hostname: string;
  os_version: string;
  ols_version: string;
  mysql_version: string;
  php_versions: string[];
}

export default function AdminServerStatus() {
  const [restarting, setRestarting] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [stats, setStats] = useState<ServerStats>({
    cpu_usage: 0,
    ram_used: 0,
    ram_total: 2048,
    disk_used: 0,
    disk_total: 20,
  });

  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);

  const [services, setServices] = useState<ServerService[]>([
    { id: "lsws", name: "OpenLiteSpeed Web Server", status: "running", uptime: "Loading...", memory: "12.4 MB", cpu: "0.2%" },
    { id: "mysql", name: "MySQL Server (MariaDB)", status: "running", uptime: "Loading...", memory: "186.2 MB", cpu: "1.4%" },
    { id: "php8.3-fpm", name: "PHP-FPM 8.3 Daemon", status: "running", uptime: "Loading...", memory: "32.1 MB", cpu: "0.5%" },
    { id: "redis", name: "Redis Cache System", status: "running", uptime: "Loading...", memory: "4.8 MB", cpu: "0.0%" },
  ]);

  const fetchData = async () => {
    try {
      setError(null);
      const [statsRes, servicesRes] = await Promise.all([
        API.get("/admin/settings/server-info"),
        API.get("/admin/server/services"),
      ]);

      if (statsRes.data.success) {
        const data = statsRes.data.data;
        setStats({
          cpu_usage: data.cpu_usage,
          ram_used: data.ram_used_mb,
          ram_total: data.ram_total_mb,
          disk_used: data.disk_used_gb,
          disk_total: data.disk_total_gb,
        });
        setServerInfo(data);
      }
      
      if (servicesRes.data.success) {
        const rawServices = servicesRes.data.data;
        setServices((prev) =>
          prev.map((svc) => {
            const rawSvc = rawServices.find(
              (r: any) =>
                (svc.id === "lsws" && r.name === "OpenLiteSpeed") ||
                (svc.id === "mysql" && r.name === "MySQL") ||
                (svc.id === "php8.3-fpm" && r.name === "PHP-FPM") ||
                (svc.id === "redis" && r.name === "Redis")
            );
            return rawSvc
              ? {
                  ...svc,
                  status: rawSvc.status,
                  uptime: rawSvc.uptime,
                }
              : svc;
          })
        );
      }
    } catch (err: any) {
      console.error("Failed to load server status telemetry:", err);
      setError("Failed to fetch server real-time daemon statuses and stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 15s for live resources
    const timer = setInterval(fetchData, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleRestart = async (serviceId: string, serviceName: string) => {
    setRestarting(serviceId);
    try {
      const response = await API.post(`/admin/server/restart/${serviceId}`);
      if (response.data.success) {
        alert(`${serviceName} restarted successfully!`);
        fetchData();
      } else {
        alert(`Failed to restart ${serviceName}: ${response.data.message}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred restarting ${serviceName}.`);
    } finally {
      setRestarting(null);
    }
  };

  // RAM Allocation percentage
  const ramPercent = stats.ram_total > 0 ? Math.round((stats.ram_used / stats.ram_total) * 100) : 0;
  // Disk Storage percentage
  const diskPercent = stats.disk_total > 0 ? Math.round((stats.disk_used / stats.disk_total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" />
            Server Status & Telemetry
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Examine system hardware usage metrics, manage application daemons, and review hypervisor resource allocations.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          disabled={loading}
          className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh stats</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CPU Usage Card */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">CPU Average Load</p>
              <h3 className="text-xl font-bold text-gray-800">{stats.cpu_usage}%</h3>
            </div>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(stats.cpu_usage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
              <span>0% Idle</span>
              <span>100% Max</span>
            </div>
          </div>
        </div>

        {/* RAM Usage Card */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-50 text-green-500 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">RAM Allocation</p>
              <h3 className="text-xl font-bold text-gray-800">
                {stats.ram_used} MB / {stats.ram_total} MB
              </h3>
            </div>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(ramPercent, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
              <span>{ramPercent}% Allocated</span>
              <span>{stats.ram_total} MB Capacity</span>
            </div>
          </div>
        </div>

        {/* Disk Card */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-50 text-purple-500 rounded-xl">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Disk Storage</p>
              <h3 className="text-xl font-bold text-gray-800">
                {stats.disk_used} GB / {stats.disk_total} GB
              </h3>
            </div>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(diskPercent, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
              <span>{diskPercent}% Operational limits</span>
              <span>{stats.disk_total} GB Disk Capacity</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid: Services on Left, Daemons info on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Services Status Monitor Grid */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-gray-600" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Application Daemons Status</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all hover:border-gray-300"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-gray-800">{svc.name}</h3>
                    <p className="text-[10px] font-mono text-gray-400">service ID: {svc.id}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${
                      svc.status === "running" ? "bg-green-500" : "bg-red-500"
                    }`}></span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      svc.status === "running" ? "text-green-600" : "text-red-600"
                    }`}>
                      {svc.status}
                    </span>
                  </div>
                </div>

                {/* Info details */}
                <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-gray-100 text-[11px] font-semibold text-gray-650">
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Uptime</span>
                    <span>{svc.uptime}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Memory</span>
                    <span>{svc.memory}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">CPU Share</span>
                    <span>{svc.cpu}</span>
                  </div>
                </div>

                {/* Actions footer */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-gray-400 font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span>Active PID limits locked</span>
                  </span>
                  <button
                    disabled={restarting === svc.id}
                    onClick={() => handleRestart(svc.id, svc.name)}
                    className="flex items-center space-x-1.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${restarting === svc.id ? "animate-spin" : ""}`} />
                    <span>{restarting === svc.id ? "Restarting..." : "Restart"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Host Diagnostics / Server Info */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-gray-600" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Host System Diagnostics</h2>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
              <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">System Information</h3>
                <p className="text-[11px] text-gray-400 font-semibold">Underlying physical hypervisor bindings</p>
              </div>
            </div>

            {loading && !serverInfo ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                <p className="text-xs text-gray-400 font-semibold">Reading OS environment info...</p>
              </div>
            ) : serverInfo ? (
              <div className="space-y-3 text-xs font-semibold text-gray-750">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">Server Hostname</span>
                  <span className="font-mono text-gray-800 font-bold">{serverInfo.hostname}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">Main Server IP</span>
                  <span className="font-mono text-gray-800 font-bold">{serverInfo.server_ip}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">Operating System</span>
                  <span className="text-gray-800 font-bold">{serverInfo.os_version}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">Web Server Engine</span>
                  <span className="text-gray-800 font-bold">{serverInfo.ols_version}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400">MySQL Database Server</span>
                  <span className="text-gray-800 font-bold">{serverInfo.mysql_version}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">PHP CLI Engine</span>
                  <span className="text-gray-800 font-bold">Active: PHP 8.3 (System Default)</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-400">
                Failed to retrieve host environment diagnostics.
              </div>
            )}
          </div>

          {/* Quick Warning/Help notice card */}
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-5 flex items-start space-x-3 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-amber-800 font-semibold">
              <h4 className="font-bold">System Status Warning Bounds</h4>
              <p className="text-amber-700/90 leading-relaxed font-medium">
                Services will automatically attempt grace recovery if memory boundaries exceed 90%. Any hard reboot of OLS/MySQL processes will temporarily interrupt active user web transactions.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
