"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import { Plus, Database, HardDrive, Share2, Mail, BadgeCheck, Trash2, Edit } from "lucide-react";

export default function AdminPackages() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [diskSpace, setDiskSpace] = useState("");
  const [bandwidth, setBandwidth] = useState("");
  const [databases, setDatabases] = useState("");
  const [emailAccounts, setEmailAccounts] = useState("");
  const [addonDomains, setAddonDomains] = useState("");
  const [subdomains, setSubdomains] = useState("");
  const [ftpAccounts, setFtpAccounts] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch packages
  const { data: packages, isLoading } = useQuery({
    queryKey: ["admin", "packages"],
    queryFn: async () => {
      try {
        const response = await API.get("/admin/packages");
        const resData = response.data.data;
        if (resData && typeof resData === "object" && "data" in resData && Array.isArray(resData.data)) {
          return resData.data;
        }
        if (Array.isArray(resData)) {
          return resData;
        }
        return [];
      } catch (err) {
        console.error("API offline, loading mock packages.");
        return [];
      }
    },
  });

  // Create Package Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/admin/packages", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "packages"] });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to create hosting package.");
    }
  });

  // Update Package Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await API.put(`/admin/packages/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "packages"] });
      setEditingPkg(null);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to update hosting package.");
    }
  });

  // Delete Package Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/admin/packages/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "packages"] });
    }
  });

  const resetForm = () => {
    setName("");
    setDiskSpace("");
    setBandwidth("");
    setDatabases("");
    setEmailAccounts("");
    setAddonDomains("");
    setSubdomains("");
    setFtpAccounts("");
    setErrorMsg("");
  };

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !diskSpace || !bandwidth || !databases || !emailAccounts || !addonDomains || !subdomains || !ftpAccounts) {
      setErrorMsg("All fields are strictly required.");
      return;
    }
    const payload = {
      name,
      disk_space: parseInt(diskSpace),
      bandwidth: parseInt(bandwidth),
      databases: parseInt(databases),
      email_accounts: parseInt(emailAccounts),
      ftp_accounts: parseInt(ftpAccounts),
      subdomains: parseInt(subdomains),
      addon_domains: parseInt(addonDomains),
      parked_domains: 0,
      ssl_certificates: 1,
      daily_backups: 1,
      free_domain: false,
    };
    createMutation.mutate(payload);
  };

  const handleEditClick = (pkg: any) => {
    setEditingPkg(pkg);
    setName(pkg.name);
    setDiskSpace(pkg.disk_space.toString());
    setBandwidth(pkg.bandwidth.toString());
    setDatabases(pkg.databases.toString());
    setEmailAccounts(pkg.email_accounts.toString());
    setAddonDomains(pkg.addon_domains ? pkg.addon_domains.toString() : "5");
    setSubdomains(pkg.subdomains ? pkg.subdomains.toString() : "5");
    setFtpAccounts(pkg.ftp_accounts ? pkg.ftp_accounts.toString() : "5");
  };

  const handleUpdatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg) return;
    if (!name || !diskSpace || !bandwidth || !databases || !emailAccounts || !addonDomains || !subdomains || !ftpAccounts) {
      setErrorMsg("All fields are required.");
      return;
    }
    const payload = {
      name,
      disk_space: parseInt(diskSpace),
      bandwidth: parseInt(bandwidth),
      databases: parseInt(databases),
      email_accounts: parseInt(emailAccounts),
      ftp_accounts: parseInt(ftpAccounts),
      subdomains: parseInt(subdomains),
      addon_domains: parseInt(addonDomains),
      parked_domains: editingPkg.parked_domains || 0,
      ssl_certificates: editingPkg.ssl_certificates || 1,
      daily_backups: editingPkg.daily_backups || 1,
      free_domain: editingPkg.free_domain || false,
    };
    updateMutation.mutate({ id: editingPkg.id, payload });
  };

  const handleDeletePackage = (id: number, pkgName: string) => {
    if (confirm(`Warning: Deleting hosting package ${pkgName} will leave any current containers assigned to it without dynamic metrics limits. Proceed?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Hosting Packages</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, edit, and configure packaging technical limits.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddOpen(true); }}
          className="flex items-center space-x-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 rounded-md shadow transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Create Package</span>
        </button>
      </div>

      {/* Grid of Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array(4).fill(0).map((_, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-gray-100 rounded w-2/3"></div>
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <div className="h-4 bg-gray-100 rounded w-full"></div>
                <div className="h-4 bg-gray-100 rounded w-full"></div>
                <div className="h-4 bg-gray-100 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : packages && packages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {packages?.map((pkg: any) => (
            <div
              key={pkg.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
            >
              {/* Card Head */}
              <div className="p-6 border-b border-gray-100 space-y-2 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-800">{pkg.name}</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block">
                  Technical Profile
                </span>
              </div>

              {/* Resource specifications list */}
              <div className="p-6 flex-1 space-y-4 text-sm text-gray-600">
                {/* Disk Space */}
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 flex justify-between">
                    <span className="font-medium text-gray-500">Disk Space</span>
                    <span className="font-bold text-gray-800">
                      {pkg.disk_space >= 1024 ? `${pkg.disk_space / 1024} GB` : `${pkg.disk_space} MB`}
                    </span>
                  </div>
                </div>

                {/* Bandwidth */}
                <div className="flex items-center space-x-3">
                  <Share2 className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 flex justify-between">
                    <span className="font-medium text-gray-500">Bandwidth</span>
                    <span className="font-bold text-gray-800">
                      {pkg.bandwidth} GB
                    </span>
                  </div>
                </div>

                {/* Databases */}
                <div className="flex items-center space-x-3">
                  <Database className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 flex justify-between">
                    <span className="font-medium text-gray-500">Databases</span>
                    <span className="font-bold text-gray-800">
                      {pkg.databases === 99 ? "Unlimited" : pkg.databases}
                    </span>
                  </div>
                </div>

                {/* Email Accounts */}
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 flex justify-between">
                    <span className="font-medium text-gray-500">Email Accounts</span>
                    <span className="font-bold text-gray-800">
                      {pkg.email_accounts === 99 ? "Unlimited" : pkg.email_accounts}
                    </span>
                  </div>
                </div>

                {/* Addon Domains */}
                <div className="flex items-center space-x-3">
                  <Share2 className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 flex justify-between">
                    <span className="font-medium text-gray-500">Addon Domains</span>
                    <span className="font-bold text-gray-800">
                      {pkg.addon_domains === 99 ? "Unlimited" : (pkg.addon_domains || 5)}
                    </span>
                  </div>
                </div>

                {/* Subdomains */}
                <div className="flex items-center space-x-3">
                  <BadgeCheck className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 flex justify-between">
                    <span className="font-medium text-gray-500">Subdomains</span>
                    <span className="font-bold text-gray-800">
                      {pkg.subdomains === 99 ? "Unlimited" : (pkg.subdomains || 5)}
                    </span>
                  </div>
                </div>

                {/* FTP Accounts */}
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 flex justify-between">
                    <span className="font-medium text-gray-500">FTP Accounts</span>
                    <span className="font-bold text-gray-800">
                      {pkg.ftp_accounts === 99 ? "Unlimited" : (pkg.ftp_accounts || 5)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleEditClick(pkg)}
                  className="text-primary hover:text-primary-hover font-semibold px-2 py-1 flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Plan
                </button>
                <button
                  onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                  className="text-red-500 hover:text-red-700 font-semibold px-2 py-1 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500 font-semibold">
          No service plans configured yet. Click Create Package to configure one.
        </div>
      )}

      {/* Add / Edit Package Modal */}
      {(isAddOpen || !!editingPkg) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 my-8">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                {editingPkg ? `Modify Service Package: ${editingPkg.name}` : "Configure New Service Plan"}
              </h2>
              <button 
                onClick={() => { setIsAddOpen(false); setEditingPkg(null); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={editingPkg ? handleUpdatePackage : handleCreatePackage} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              {/* Grid Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Plan Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Basic Plan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Disk Quota (MB) *</label>
                  <input
                    type="number"
                    placeholder="Disk Space e.g. 2048"
                    value={diskSpace}
                    onChange={(e) => setDiskSpace(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Bandwidth Limit (GB) *</label>
                  <input
                    type="number"
                    placeholder="Bandwidth e.g. 20"
                    value={bandwidth}
                    onChange={(e) => setBandwidth(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">MySQL Databases Quota *</label>
                  <input
                    type="number"
                    placeholder="Databases quota e.g. 5"
                    value={databases}
                    onChange={(e) => setDatabases(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Mailbox accounts Quota *</label>
                  <input
                    type="number"
                    placeholder="Email quota e.g. 10"
                    value={emailAccounts}
                    onChange={(e) => setEmailAccounts(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Max Addon Domains *</label>
                  <input
                    type="number"
                    placeholder="Addon domains limit e.g. 5"
                    value={addonDomains}
                    onChange={(e) => setAddonDomains(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Max Subdomains *</label>
                  <input
                    type="number"
                    placeholder="Subdomains limit e.g. 5"
                    value={subdomains}
                    onChange={(e) => setSubdomains(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Max FTP Accounts *</label>
                  <input
                    type="number"
                    placeholder="FTP accounts limit e.g. 5"
                    value={ftpAccounts}
                    onChange={(e) => setFtpAccounts(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingPkg(null); resetForm(); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2 transition-all"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingPkg ? "Update Package" : "Create Plan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
