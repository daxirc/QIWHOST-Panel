"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import { 
  Cpu, 
  Search, 
  Activity, 
  Layers, 
  User, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Database,
  ExternalLink,
  Loader2,
  Folder,
  Globe,
  Code
} from "lucide-react";

export default function AdminNodeJs() {
  const [searchTerm, setSearchTerm] = useState("");

  // Query global Node.js applications list
  const { data: appsRes, isLoading: isAppsLoading } = useQuery({
    queryKey: ["admin", "nodejs", "list"],
    queryFn: async () => {
      const res = await API.get("/admin/nodejs");
      return res.data.data;
    }
  });

  const apps = Array.isArray(appsRes) ? appsRes : [];

  const totalApps = apps.length;
  const runningApps = apps.filter((app: any) => app.status === "running").length;
  const stoppedApps = apps.filter((app: any) => app.status === "stopped").length;
  const errorApps = apps.filter((app: any) => app.status === "error").length;

  const filteredApps = apps.filter((app: any) => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.owner || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.domain || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-semibold text-sm">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <Cpu className="w-7 h-7 text-primary" />
          Global Node.js Deployments Telemetry
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor all active Node.js servers, express containers, and background worker runners mapped across your cluster server nodes.
        </p>
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-semibold">
        {/* Total Apps */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-orange-50 text-primary rounded-full shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Node Apps</span>
            <h3 className="text-2xl font-extrabold text-gray-800">
              {isAppsLoading ? "..." : totalApps}
            </h3>
          </div>
        </div>

        {/* Running Apps */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-green-50 text-green-600 rounded-full shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Active running</span>
            <h3 className="text-2xl font-extrabold text-gray-800">
              {isAppsLoading ? "..." : runningApps}
            </h3>
          </div>
        </div>

        {/* Stopped Apps */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-gray-50 text-gray-650 rounded-full shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Stopped processes</span>
            <h3 className="text-2xl font-extrabold text-gray-800">
              {isAppsLoading ? "..." : stoppedApps}
            </h3>
          </div>
        </div>

        {/* Errors Apps */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-red-50 text-red-650 rounded-full shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Error states</span>
            <h3 className="text-2xl font-extrabold text-gray-850">
              {isAppsLoading ? "..." : errorApps}
            </h3>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800">Operational PM2 Processes</h3>
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by app, owner, domain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-55 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-800"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isAppsLoading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium font-semibold">Querying cluster endpoints for PM2 daemons...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Cpu className="w-12 h-12 mx-auto text-gray-250 animate-pulse" />
            <p className="font-bold text-gray-600">No Node.js Applications Deployed</p>
            <p className="text-xs">No customer Node.js application instances found on this node.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Application Name</th>
                  <th className="px-6 py-4">Account Owner</th>
                  <th className="px-6 py-4">Bound Domain</th>
                  <th className="px-6 py-4">Port</th>
                  <th className="px-6 py-4">Engine</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-gray-700">
                {filteredApps.map((app: any) => (
                  <tr key={app.id} className="hover:bg-gray-55/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-900 font-bold">
                        <Code className="w-4 h-4 text-primary shrink-0" />
                        <span>{app.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{app.owner}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                        <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{app.domain}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-700">
                      {app.port}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-bold font-mono">
                        v{app.node_version}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        app.status === "running"
                          ? "bg-green-50 text-green-600 border border-green-200"
                          : app.status === "error"
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : "bg-gray-50 text-gray-600 border border-gray-200"
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`http://${app.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        <span>Visit</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
