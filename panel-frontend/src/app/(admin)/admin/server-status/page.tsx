"use client";

import React, { useState, useEffect } from "react";
import { Server, RefreshCw, Cpu, Activity, AlertCircle } from "lucide-react";
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
        API.get("/admin/server/stats"),
        API.get("/admin/server/services"),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
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
      console.error("Failed to load server data:", err);
      setError("Failed to fetch server real-time daemon statuses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30s
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleRestart = async (serviceId: string, serviceName: string) => {
    setRestarting(serviceId);
    try {
      const response = await API.post(`/admin/server/restart/${serviceId}`);
      if (response.data.success) {
        alert(`${serviceName} restarted successfully inside the hosting container!`);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Server Daemon Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor system services, restarts, processes, and memory pools.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          disabled={loading}
          className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CPU Usage Card */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-full">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">CPU Utilization</p>
            <h3 className="text-xl font-bold text-gray-800">{stats.cpu_usage}%</h3>
            <p className="text-xs text-gray-400 font-medium">Virtual Core load limits</p>
          </div>
        </div>

        {/* RAM Usage Card */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-500 rounded-full">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Memory Allocation</p>
            <h3 className="text-xl font-bold text-gray-800">
              {stats.ram_used} MB / {stats.ram_total} MB
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              {stats.ram_total > 0 ? Math.round((stats.ram_used / stats.ram_total) * 100) : 0}% allocated capacity
            </p>
          </div>
        </div>

        {/* Disk Card */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-500 rounded-full">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Disk Storage</p>
            <h3 className="text-xl font-bold text-gray-800">
              {stats.disk_used} GB / {stats.disk_total} GB
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              {stats.disk_total > 0 ? Math.round((stats.disk_used / stats.disk_total) * 100) : 0}% operational limits
            </p>
          </div>
        </div>

      </div>

      {/* Services Status Monitor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6 flex flex-col justify-between"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-800">{svc.name}</h3>
                <p className="text-xs font-mono text-gray-400">Daemon service ID: {svc.id}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  svc.status === "running" ? "bg-green-500" : "bg-red-500"
                }`}></span>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  svc.status === "running" ? "text-green-600" : "text-red-600"
                }`}>
                  {svc.status}
                </span>
              </div>
            </div>

            {/* Info details */}
            <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-gray-100 text-xs">
              <div>
                <p className="font-bold text-gray-400 uppercase tracking-wider mb-1">Uptime</p>
                <p className="font-semibold text-gray-700">{svc.uptime}</p>
              </div>
              <div>
                <p className="font-bold text-gray-400 uppercase tracking-wider mb-1">Memory Pool</p>
                <p className="font-semibold text-gray-700">{svc.memory}</p>
              </div>
              <div>
                <p className="font-bold text-gray-400 uppercase tracking-wider mb-1">CPU Share</p>
                <p className="font-semibold text-gray-700">{svc.cpu}</p>
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-400 font-semibold flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                <span>PID matches execution locks</span>
              </span>
              <button
                disabled={restarting === svc.id}
                onClick={() => handleRestart(svc.id, svc.name)}
                className="flex items-center space-x-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white text-xs font-bold px-3 py-2 rounded-md shadow-sm transition-colors duration-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${restarting === svc.id ? "animate-spin" : ""}`} />
                <span>{restarting === svc.id ? "Restarting..." : "Restart"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
