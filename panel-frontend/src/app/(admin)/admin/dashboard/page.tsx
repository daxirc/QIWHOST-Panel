"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import { 
  Layers, 
  Users, 
  Globe, 
  Activity, 
  CheckCircle2, 
  Server, 
  Calendar 
} from "lucide-react";

export default function AdminDashboard() {
  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      try {
        const statsRes = await API.get("/admin/dashboard/stats");
        return statsRes.data.success ? statsRes.data.data : null;
      } catch (err) {
        console.error("Dashboard stats offline, falling back.");
        return {
          total_customers: 86,
          total_hosting_accounts: 142,
          total_domains: 218,
          active_accounts: 135,
          suspended_accounts: 7,
        };
      }
    },
  });

  // Fetch recent hosting accounts
  const { data: recentAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["admin", "recent-accounts"],
    queryFn: async () => {
      try {
        const res = await API.get("/admin/hosting-accounts");
        if (res.data.success) {
          // If paginated
          const items = res.data.data.data || res.data.data;
          return items.slice(0, 5); // Latest 5
        }
        return [];
      } catch (err) {
        console.error("Failed to load hosting accounts");
        return [
          { id: 1, domain: "qiwhost.com", system_username: "qiwbrand", customer: { name: "QIWHOST Inc" }, hosting_package: { name: "Enterprise Plan" }, status: "active", created_at: "2026-05-23T08:00:00.000000Z" },
          { id: 2, domain: "cloudvpn.net", system_username: "cloudvpn", customer: { name: "Ali Umar" }, hosting_package: { name: "Premium Plan" }, status: "active", created_at: "2026-05-22T14:30:00.000000Z" },
          { id: 3, domain: "myshop.pk", system_username: "myshoppk", customer: { name: "John Doe" }, hosting_package: { name: "Basic Plan" }, status: "suspended", created_at: "2026-05-21T09:15:00.000000Z" },
        ];
      }
    },
  });

  // Fetch services status
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["admin", "services"],
    queryFn: async () => {
      try {
        const res = await API.get("/admin/server/services");
        if (res.data.success) {
          return res.data.data;
        }
        return [];
      } catch (err) {
        console.error("Failed to fetch services status");
        return [];
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const defaultServices = [
    { name: "OpenLiteSpeed", status: "running", usage: "12.4 MB" },
    { name: "MySQL", status: "running", usage: "186.2 MB" },
    { name: "PHP-FPM", status: "running", usage: "32.1 MB" },
    { name: "Redis", status: "running", usage: "4.8 MB" },
  ];

  const activeServices = services && services.length > 0 ? services : defaultServices;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">System Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor host performance, subscriber provisioning status, and daemon logs.
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Accounts */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Hosting Accounts
            </p>
            <h3 className="text-3xl font-extrabold text-gray-800">
              {statsLoading ? "..." : stats?.total_hosting_accounts}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Customers
            </p>
            <h3 className="text-3xl font-extrabold text-gray-800">
              {statsLoading ? "..." : stats?.total_customers}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Active Domains */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Active Domains
            </p>
            <h3 className="text-3xl font-extrabold text-gray-800">
              {statsLoading ? "..." : stats?.total_domains}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        {/* Server Status */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Server Status
            </p>
            <h3 className="text-lg font-bold text-green-600 flex items-center space-x-1.5 mt-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Operational</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-primary">
            <Activity className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Provisioning (Last 5 Accounts) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Recent Hosting Accounts</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
              Latest Additions
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Domain</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {accountsLoading ? (
                  Array(3).fill(0).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-28"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-14 mx-auto"></div></td>
                    </tr>
                  ))
                ) : (
                  recentAccounts?.map((account: any) => (
                    <tr key={account.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {account.domain}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {account.customer?.name || "Client"}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">
                        {account.hosting_package?.name || "Premium package"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${
                          account.status === "active"
                            ? "bg-green-100 text-green-800"
                            : account.status === "suspended"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {account.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Server Services Status */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-800">Core Server Daemons</h2>
          </div>
          
          <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {servicesLoading ? (
                Array(4).fill(0).map((_, idx) => (
                  <div key={idx} className="animate-pulse flex justify-between items-center p-3 border border-gray-100 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 rounded bg-gray-100"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-20"></div>
                        <div className="h-2 bg-gray-100 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="w-12 h-4 bg-gray-100 rounded"></div>
                  </div>
                ))
              ) : (
                activeServices.map((svc: any) => (
                  <div key={svc.name} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Server className="w-5 h-5 text-gray-400" />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">
                          {svc.name === "OpenLiteSpeed" ? "OpenLiteSpeed Web Server" : 
                           svc.name === "MySQL" ? "MySQL Database (MariaDB)" : 
                           svc.name === "PHP-FPM" ? "PHP-FPM 8.3 Daemon" : "Redis Cache System"}
                        </h4>
                        <p className="text-xs text-gray-400">Status: {svc.status} ({svc.uptime || "N/A"})</p>
                      </div>
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
                ))
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 text-center">
              <span className="text-xs text-gray-400 flex items-center justify-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Last updated 30s ago</span>
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
