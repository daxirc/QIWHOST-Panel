"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import { Search, Eye, Power, Trash2, Plus, Server, Layers, User, ShieldCheck } from "lucide-react";

export default function AdminHostingAccounts() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [domain, setDomain] = useState("");
  const [systemUsername, setSystemUsername] = useState("");
  const [systemPassword, setSystemPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch hosting accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["admin", "hosting-accounts"],
    queryFn: async () => {
      try {
        const response = await API.get("/admin/hosting-accounts");
        const resData = response.data.data;
        if (resData && typeof resData === "object" && "data" in resData && Array.isArray(resData.data)) {
          return resData.data;
        }
        if (Array.isArray(resData)) {
          return resData;
        }
        return [];
      } catch (err) {
        console.error("API offline, loading mock hosting accounts.");
        return [];
      }
    },
  });

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ["admin", "customers-dropdown"],
    queryFn: async () => {
      try {
        const response = await API.get("/admin/customers");
        const resData = response.data.data;
        if (resData && typeof resData === "object" && "data" in resData && Array.isArray(resData.data)) {
          return resData.data;
        }
        return Array.isArray(resData) ? resData : [];
      } catch (err) {
        return [];
      }
    },
  });

  // Fetch packages for dropdown
  const { data: packages } = useQuery({
    queryKey: ["admin", "packages-dropdown"],
    queryFn: async () => {
      try {
        const response = await API.get("/admin/packages");
        const resData = response.data.data;
        if (resData && typeof resData === "object" && "data" in resData && Array.isArray(resData.data)) {
          return resData.data;
        }
        return Array.isArray(resData) ? resData : [];
      } catch (err) {
        return [];
      }
    },
  });

  // Create Hosting Account Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/admin/hosting-accounts", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "hosting-accounts"] });
      setIsAddOpen(false);
      setCustomerId("");
      setPackageId("");
      setDomain("");
      setSystemUsername("");
      setSystemPassword("");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to provision hosting account container.");
    }
  });

  // Suspend Mutation
  const suspendMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/admin/hosting-accounts/${id}/suspend`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "hosting-accounts"] });
    }
  });

  // Unsuspend Mutation
  const unsuspendMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/admin/hosting-accounts/${id}/unsuspend`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "hosting-accounts"] });
    }
  });

  // Terminate Mutation
  const terminateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/admin/hosting-accounts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "hosting-accounts"] });
    }
  });

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !packageId || !domain || !systemUsername || !systemPassword) {
      setErrorMsg("All fields are strictly required.");
      return;
    }
    createMutation.mutate({
      customer_id: parseInt(customerId),
      hosting_package_id: parseInt(packageId),
      domain,
      system_username: systemUsername,
      system_password: systemPassword,
    });
  };

  const handleToggleSuspend = (id: number, currentStatus: string, domainName: string) => {
    if (currentStatus === "active") {
      if (confirm(`Are you sure you want to suspend the hosting container for ${domainName}?`)) {
        suspendMutation.mutate(id);
      }
    } else {
      if (confirm(`Do you want to restore and unsuspend ${domainName}?`)) {
        unsuspendMutation.mutate(id);
      }
    }
  };

  const handleTerminate = (id: number, domainName: string) => {
    if (confirm(`CRITICAL WARNING: Terminating ${domainName} will permanently WIPE the subscriber's public_html folder, database links, and OLS vhost definitions! This action is irreversible. Type OK to proceed.`)) {
      terminateMutation.mutate(id);
    }
  };

  const accountList = Array.isArray(accounts) ? accounts : [];
  const filteredAccounts = accountList.filter((acc: any) => {
    const term = searchTerm.toLowerCase();
    return (
      acc.domain?.toLowerCase().includes(term) ||
      acc.system_username?.toLowerCase().includes(term) ||
      acc.customer?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary" />
            Hosting Account Containers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Provision OpenLiteSpeed isolated system-level subscriber accounts, manage system locks, and verify disk quotes.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center space-x-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Account</span>
        </button>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm flex items-center justify-between">
        <div className="relative w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search accounts by domain, user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm pl-9 pr-4 py-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Primary Domain</th>
                <th className="px-6 py-4">System User</th>
                <th className="px-6 py-4">PHP Version</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Hosting Package</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
              {isLoading ? (
                Array(3).fill(0).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-28"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-14 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredAccounts.length > 0 ? (
                filteredAccounts.map((acc: any) => (
                  <tr key={acc.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {acc.domain}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {acc.system_username}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-600">
                      PHP {acc.php_version || "8.3"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {acc.customer?.name || "Client"}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                      {acc.hosting_package?.name || "Premium Plan"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${
                        acc.status === "active"
                          ? "bg-green-100 text-green-800"
                          : acc.status === "suspended"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleSuspend(acc.id, acc.status, acc.domain)}
                          className={`p-1.5 rounded transition-colors duration-150 ${
                            acc.status === "active"
                              ? "text-yellow-500 hover:bg-yellow-50 hover:text-yellow-700"
                              : "text-green-500 hover:bg-green-50 hover:text-green-700"
                          }`}
                          title={acc.status === "active" ? "Lock OS Login / Suspend" : "Restore Access / Unsuspend"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTerminate(acc.id, acc.domain)}
                          className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors duration-150"
                          title="Terminate Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 font-medium">
                    No active hosting containers found. Click Provision to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Account Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 my-8">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Provision Web Hosting Container
              </h2>
              <button 
                onClick={() => { setIsAddOpen(false); setErrorMsg(""); }}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateAccount} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              {/* Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Subscriber Profile *</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers?.map((cust: any) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.name} ({cust.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Service Package *</label>
                  <select
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  >
                    <option value="">-- Choose Package --</option>
                    {packages?.map((pkg: any) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} (${pkg.price}/mo)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-gray-400" />
                  Linux OS User & OLS VirtualHost Settings
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase block">Primary FQDN Domain *</label>
                    <input
                      type="text"
                      placeholder="e.g. subscriberdomain.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase block">OS Username *</label>
                      <input
                        type="text"
                        placeholder="alphanumeric, max 16 chars"
                        value={systemUsername}
                        onChange={(e) => setSystemUsername(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase block">System Password *</label>
                      <input
                        type="password"
                        placeholder="Container shell SSH password"
                        value={systemPassword}
                        onChange={(e) => setSystemPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setErrorMsg(""); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2 transition-all"
                >
                  {createMutation.isPending ? "Provisioning Container..." : "Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
