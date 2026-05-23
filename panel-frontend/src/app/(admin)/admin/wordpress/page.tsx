"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import { 
  Globe, 
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
  Folder
} from "lucide-react";

export default function AdminWordPress() {
  const [searchTerm, setSearchTerm] = useState("");

  // Query global WP statistics
  const { data: statsRes, isLoading: isStatsLoading } = useQuery({
    queryKey: ["admin", "wordpress", "stats"],
    queryFn: async () => {
      const res = await API.get("/admin/wordpress/stats");
      return res.data.data;
    }
  });

  // Query all installations in the cluster
  const { data: installationsRes, isLoading: isWpLoading } = useQuery({
    queryKey: ["admin", "wordpress", "list"],
    queryFn: async () => {
      const res = await API.get("/admin/wordpress");
      return res.data.data;
    }
  });

  const installations = Array.isArray(installationsRes) ? installationsRes : [];

  const filteredInstallations = installations.filter((wp: any) => 
    wp.domain?.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (wp.hosting_account?.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (wp.db_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <Globe className="w-7 h-7 text-primary" />
          Global WordPress Telemetry
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor all active WordPress instances deployed across your hosting cluster, review engine versions, and inspect security settings.
        </p>
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-semibold">
        {/* Total Sites */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-orange-50 text-primary rounded-full shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total WP Deployed</span>
            <h3 className="text-2xl font-extrabold text-gray-800">
              {isStatsLoading ? "..." : statsRes?.total_wp_installations ?? 0}
            </h3>
          </div>
        </div>

        {/* Outdated Sites */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-650 rounded-full shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Outdated Versions</span>
            <h3 className="text-2xl font-extrabold text-gray-850">
              {isStatsLoading ? "..." : statsRes?.outdated_wp_installations ?? 0}
            </h3>
          </div>
        </div>

        {/* Maintenance overrides */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-green-50 text-green-600 rounded-full shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">In Maintenance Mode</span>
            <h3 className="text-2xl font-extrabold text-gray-800">
              {isStatsLoading ? "..." : statsRes?.maintenance_wp_installations ?? 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Search Input bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm font-semibold">
        <h3 className="text-sm font-bold text-gray-800">WordPress Sites Directory</h3>
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by domain, customer, database..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-800"
          />
        </div>
      </div>

      {/* Deployments Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isWpLoading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium font-semibold">Querying cluster endpoints for installations...</p>
          </div>
        ) : filteredInstallations.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Globe className="w-12 h-12 mx-auto text-gray-200 animate-pulse" />
            <p className="font-bold text-gray-600">No WordPress Deployed</p>
            <p className="text-xs">No active customer WordPress instances found in this cluster node.</p>
          </div>
        ) : (
          <div className="overflow-x-auto font-semibold text-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Addon Domain</th>
                  <th className="px-6 py-4">Account Owner</th>
                  <th className="px-6 py-4">Filing Path</th>
                  <th className="px-6 py-4">Version</th>
                  <th className="px-6 py-4">Database</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-gray-700">
                {filteredInstallations.map((wp: any) => (
                  <tr key={wp.id} className="hover:bg-gray-55/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-900 font-bold">
                        <Globe className="w-4 h-4 text-primary shrink-0" />
                        <span>{wp.domain?.domain || "Unknown Domain"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{wp.hosting_account?.customer?.name || "System Owner"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                        <Folder className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{wp.path}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                        {wp.version || "6.5"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Database className="w-3.5 h-3.5 text-gray-400" />
                        <span>{wp.db_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        wp.status === "maintenance"
                          ? "bg-orange-50 text-orange-600 border border-orange-200"
                          : "bg-green-50 text-green-600 border border-green-200"
                      }`}>
                        {wp.status === "maintenance" ? "Maintenance" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`http://${wp.domain?.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
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
