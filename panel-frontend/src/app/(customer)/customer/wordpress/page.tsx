"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  Globe, 
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
  CloudLightning,
  AlertTriangle,
  Play,
  KeyRound,
  Grid,
  CheckCircle,
  Eye,
  Loader2,
  HardDrive
} from "lucide-react";

export default function CustomerWordPress() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Installer Modal State
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [siteTitle, setSiteTitle] = useState("");
  const [adminUser, setAdminUser] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [autoUpdate, setAutoUpdate] = useState(true);

  // WP Database & Directory Inputs
  const [dbSuffix, setDbSuffix] = useState("");
  const [dbUserSuffix, setDbUserSuffix] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [directory, setDirectory] = useState("");

  // Password Change Drawer State
  const [selectedWpForPass, setSelectedWpForPass] = useState<any>(null);
  const [newAdminPassword, setNewAdminPassword] = useState("");

  // Plugins Manager State
  const [selectedWpForPlugins, setSelectedWpForPlugins] = useState<any>(null);

  // Fetch customer dashboard metrics to resolve dynamic system_username prefix
  const { data: customerData } = useQuery({
    queryKey: ["customer", "dashboard"],
    queryFn: async () => {
      const response = await API.get("/customer/dashboard");
      return response.data.data;
    },
  });

  const systemUsername = customerData?.account?.username || "user";

  // Fetch client WordPress sites
  const { data: installationsRes, isLoading: isWpLoading } = useQuery({
    queryKey: ["customer", "wordpress"],
    queryFn: async () => {
      const res = await API.get("/customer/wordpress");
      return res.data.data;
    }
  });

  const installations = Array.isArray(installationsRes) ? installationsRes : [];

  // Fetch customer domains
  const { data: domainsRes } = useQuery({
    queryKey: ["customer", "domains"],
    queryFn: async () => {
      const res = await API.get("/customer/domains");
      return res.data.data;
    }
  });

  const domains = Array.isArray(domainsRes) ? domainsRes : [];

  // Fetch plugins for active instance
  const { data: pluginsRes, isLoading: isPluginsLoading } = useQuery({
    queryKey: ["customer", "wordpress", selectedWpForPlugins?.id, "plugins"],
    queryFn: async () => {
      if (!selectedWpForPlugins?.id) return [];
      const res = await API.get(`/customer/wordpress/${selectedWpForPlugins.id}/plugins`);
      return res.data.data;
    },
    enabled: !!selectedWpForPlugins?.id
  });

  const plugins = Array.isArray(pluginsRes) ? pluginsRes : [];

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  // WP Provisioning Mutation
  const installMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { domainId, ...data } = payload;
      const res = await API.post(`/customer/wordpress/${domainId}/install`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "wordpress"] });
      setIsInstallOpen(false);
      setSiteTitle("");
      setAdminUser("");
      setAdminEmail("");
      setAdminPassword("");
      setDbSuffix("");
      setDbUserSuffix("");
      setDbPassword("");
      setDirectory("");
      showToast("success", "WordPress site successfully auto-provisioned!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "WordPress auto-provisioning failed.");
    }
  });

  // Maintenance Toggle Mutation
  const maintenanceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/customer/wordpress/${id}/maintenance-mode`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "wordpress"] });
      showToast("success", "WordPress maintenance mode toggled successfully.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to toggle maintenance mode.");
    }
  });

  // Backup Snapshot Mutation
  const backupMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/customer/wordpress/${id}/backup`);
      return res.data;
    },
    onSuccess: () => {
      showToast("success", "WordPress directory backup snapshot completed successfully.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to generate backup.");
    }
  });

  // Password Change Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await API.post(`/customer/wordpress/${id}/change-admin-password`, { password });
      return res.data;
    },
    onSuccess: () => {
      setSelectedWpForPass(null);
      setNewAdminPassword("");
      showToast("success", "WP Administrator password updated successfully.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to update administrator password.");
    }
  });

  // Core Update Mutation
  const updateCoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/customer/wordpress/${id}/update-core`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "wordpress"] });
      showToast("success", "WordPress core engine upgraded to the latest version!");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Core engine upgrade failed.");
    }
  });

  // Toggle Plugin Mutation
  const togglePluginMutation = useMutation({
    mutationFn: async ({ id, pluginName, activate }: { id: number; pluginName: string; activate: boolean }) => {
      const action = activate ? "activate" : "deactivate";
      const res = await API.post(`/customer/wordpress/${id}/plugins/${pluginName}/${action}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "wordpress", selectedWpForPlugins?.id, "plugins"] });
      showToast("success", "Plugin status updated successfully on WP instance.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to alter plugin status.");
    }
  });

  // Delete WP Mutation
  const destroyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/customer/wordpress/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "wordpress"] });
      showToast("success", "WordPress installation completely purged.");
    },
    onError: (err: any) => {
      showToast("error", err.response?.data?.message || "Failed to delete WordPress site.");
    }
  });

  const handleInstallSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomainId || !siteTitle || !adminUser || !adminEmail || !adminPassword || !dbSuffix || !dbUserSuffix || !dbPassword) {
      showToast("error", "Please fill in all installer fields.");
      return;
    }
    installMutation.mutate({
      domainId: selectedDomainId,
      site_title: siteTitle,
      admin_user: adminUser,
      admin_email: adminEmail,
      admin_password: adminPassword,
      auto_update: autoUpdate,
      db_suffix: dbSuffix,
      db_user_suffix: dbUserSuffix,
      db_password: dbPassword,
      directory: directory
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary" />
            WordPress Toolkit & Provisioner
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Deploy secure WordPress instances instantly, activate/deactivate plugins, toggle maintenance modes, and manage core telemetry.
          </p>
        </div>
        <button
          onClick={() => setIsInstallOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Install WordPress</span>
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

      {/* WordPress Directory Grid */}
      {isWpLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-gray-500 font-semibold">Scanning hosting containers for WordPress setups...</p>
        </div>
      ) : installations.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-350 rounded-xl p-12 text-center max-w-xl mx-auto space-y-4">
          <Globe className="w-12 h-12 mx-auto text-gray-300 animate-pulse" />
          <h3 className="text-lg font-bold text-gray-700">No WordPress Sites Registered</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Auto-provision a fresh WordPress blog on any of your addon domains. The system will handle standard MySQL setup, user credentials delegation, CLI config writes, and secure installation.
          </p>
          <button
            onClick={() => setIsInstallOpen(true)}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md inline-flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Launch WP Installer</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-semibold">
          {installations.map((wp: any) => (
            <div key={wp.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between gap-5 transition-all hover:shadow-md">
              {/* Top Meta info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Globe className="w-4.5 h-4.5 text-primary" />
                      <span>{wp.domain?.domain || "WordPress Instance"}</span>
                    </h3>
                    <p className="text-xs text-gray-400 font-mono mt-1 font-semibold flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5 text-gray-400" />
                      <span>{wp.path}</span>
                    </p>
                  </div>

                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm ${
                    wp.status === "maintenance"
                      ? "bg-orange-50 text-orange-600 border border-orange-200"
                      : "bg-green-50 text-green-600 border border-green-200"
                  }`}>
                    {wp.status === "maintenance" ? "Maintenance" : "Active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-600 pt-1">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400">Core Version</span>
                    <span className="text-gray-800">{wp.version || "6.5"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-400">Admin User</span>
                    <span className="text-gray-800">{wp.wp_admin_user}</span>
                  </div>
                  <div className="flex justify-between py-1 col-span-2">
                    <span className="text-gray-400">Database Name</span>
                    <span className="text-gray-800 font-mono">{wp.db_name}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick-actions bar */}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2 text-xs">
                <a
                  href={`http://${wp.domain?.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-50 border border-gray-200 text-gray-650 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visit</span>
                </a>
                <a
                  href={`http://${wp.domain?.domain}/wp-admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-50 border border-gray-200 text-gray-650 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>WP Admin</span>
                </a>
                <button
                  onClick={() => setSelectedWpForPlugins(wp)}
                  className="bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Plugins</span>
                </button>
                <button
                  onClick={() => setSelectedWpForPass(wp)}
                  className="bg-gray-50 border border-gray-200 text-gray-650 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm("Proceed with maintenance mode toggle? This alters the site visibility.")) {
                      maintenanceMutation.mutate(wp.id);
                    }
                  }}
                  className="bg-gray-50 border border-gray-200 text-gray-650 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Maintenance</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm("Create a compressed zip file copy of your WordPress folder root?")) {
                      backupMutation.mutate(wp.id);
                    }
                  }}
                  className="bg-gray-50 border border-gray-200 text-gray-650 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Backup</span>
                </button>
                <button
                  onClick={() => {
                    if (wp.version === "6.5.3") {
                      showToast("success", "WordPress core engine is already up to date.");
                      return;
                    }
                    if (confirm("Run secure WP-CLI core upgrade sequence?")) {
                      updateCoreMutation.mutate(wp.id);
                    }
                  }}
                  className="bg-gray-50 border border-gray-200 text-gray-650 hover:bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Update Engine</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm("Warning: Purging WordPress will permanently erase all folders, assets, and databases. Continue?")) {
                      destroyMutation.mutate(wp.id);
                    }
                  }}
                  className="bg-red-50 border border-red-200 text-red-650 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WordPress Auto-provisioner Modal */}
      {isInstallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                WP Installer Wizard
              </h2>
              <button 
                onClick={() => setIsInstallOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleInstallSubmit} className="p-6 space-y-4 font-semibold text-sm">
              <div className="space-y-1">
                <label className="text-xs text-gray-450 block uppercase">Target Addon Domain</label>
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">-- Select Active Domain --</option>
                  {domains.map((dom: any) => (
                    <option key={dom.id} value={dom.id}>{dom.domain}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-450 block uppercase">Blog Site Title</label>
                <input
                  type="text"
                  placeholder="e.g. My Portfolio Blog"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-455 block uppercase">WP Admin Username</label>
                <input
                  type="text"
                  placeholder="e.g. admin"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-450 block uppercase">WP Admin Email</label>
                <input
                  type="email"
                  placeholder="e.g. user@yourdomain.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-450 block uppercase">WP Admin Password</label>
                <input
                  type="password"
                  placeholder="Enter complex password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-450 block uppercase">Installation Directory</label>
                <div className="flex items-center">
                  <span className="bg-gray-100 border border-r-0 border-gray-200 text-gray-500 px-3 py-2 text-sm rounded-l-lg font-mono font-bold">
                    /
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. blog (or leave empty for root)"
                    value={directory}
                    onChange={(e) => setDirectory(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-r-lg px-3 py-2 text-gray-850 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-450 block uppercase">Database Name (Suffix)</label>
                <div className="flex items-center">
                  <span className="bg-gray-100 border border-r-0 border-gray-200 text-gray-500 px-3 py-2 text-sm rounded-l-lg font-mono font-bold">
                    {systemUsername}_
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. wpdb"
                    value={dbSuffix}
                    onChange={(e) => setDbSuffix(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-r-lg px-3 py-2 text-gray-850 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-450 block uppercase">Database User (Suffix)</label>
                <div className="flex items-center">
                  <span className="bg-gray-100 border border-r-0 border-gray-200 text-gray-500 px-3 py-2 text-sm rounded-l-lg font-mono font-bold">
                    {systemUsername}_
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. wpusr"
                    value={dbUserSuffix}
                    onChange={(e) => setDbUserSuffix(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-r-lg px-3 py-2 text-gray-850 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-455 block uppercase">Database Password</label>
                <input
                  type="password"
                  placeholder="Enter database password"
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400 uppercase">Enable Auto Updates</span>
                <input
                  type="checkbox"
                  checked={autoUpdate}
                  onChange={(e) => setAutoUpdate(e.target.checked)}
                  className="w-4.5 h-4.5 text-primary border-gray-300 rounded focus:ring-primary/20"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsInstallOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-55 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={installMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg shadow-md flex items-center gap-2 transition-all font-bold"
                >
                  {installMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Provisioning WP Site...</span>
                    </>
                  ) : (
                    <span>Provision WP Instance</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {selectedWpForPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Change WP Password
              </h2>
              <button 
                onClick={() => setSelectedWpForPass(null)}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAdminPassword) return;
                changePasswordMutation.mutate({ id: selectedWpForPass.id, password: newAdminPassword });
              }} 
              className="p-6 space-y-4 font-semibold text-sm"
            >
              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">Site Instance</label>
                <div className="bg-gray-50 border border-gray-150 p-2 rounded-lg font-bold text-gray-850">
                  {selectedWpForPass.domain?.domain}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 block uppercase">New Administrator Password</label>
                <input
                  type="password"
                  placeholder="Enter complex password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-850 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedWpForPass(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-55 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg shadow-md flex items-center gap-2 transition-all font-bold"
                >
                  {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plugins Manager Drawer Modal */}
      {selectedWpForPlugins && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Grid className="w-5 h-5 text-primary" />
                Plugins Directory
              </h2>
              <button 
                onClick={() => setSelectedWpForPlugins(null)}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto">
              <div className="border-b border-gray-100 pb-3 mb-2 font-semibold">
                <span className="text-xs text-gray-400 block uppercase">Target Instance</span>
                <span className="text-sm font-bold text-gray-800">{selectedWpForPlugins.domain?.domain}</span>
              </div>

              {isPluginsLoading ? (
                <div className="p-8 text-center text-gray-550 flex flex-col items-center justify-center gap-2 font-semibold">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span>Loading plugin templates...</span>
                </div>
              ) : plugins.length === 0 ? (
                <p className="text-center text-sm text-gray-500 font-semibold">No plugins cataloged in WP folder.</p>
              ) : (
                <div className="space-y-4 font-semibold text-sm">
                  {plugins.map((plugin: any) => (
                    <div key={plugin.name} className="border border-gray-150 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-gray-850">{plugin.title || plugin.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Version {plugin.version || "1.0.0"}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-xs uppercase font-bold ${plugin.status === "active" ? "text-green-600" : "text-gray-400"}`}>
                          {plugin.status === "active" ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => {
                            togglePluginMutation.mutate({
                              id: selectedWpForPlugins.id,
                              pluginName: plugin.name,
                              activate: plugin.status !== "active"
                            });
                          }}
                          disabled={togglePluginMutation.isPending}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                            plugin.status === "active"
                              ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                              : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                          }`}
                        >
                          {togglePluginMutation.isPending && togglePluginMutation.variables?.pluginName === plugin.name ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : plugin.status === "active" ? (
                            "Deactivate"
                          ) : (
                            "Activate"
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end font-semibold text-sm">
              <button
                onClick={() => setSelectedWpForPlugins(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
