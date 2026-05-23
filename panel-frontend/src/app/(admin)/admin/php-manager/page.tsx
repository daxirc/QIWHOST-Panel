"use client";

import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Settings, 
  ToggleLeft, 
  ToggleRight, 
  Loader2, 
  Check, 
  AlertCircle,
  HardDrive,
  Users,
  Layers,
  Save,
  Search
} from "lucide-react";
import { AdminAPI as API } from "@/lib/api";

interface Account {
  id: number;
  domain: string;
  system_username: string;
  php_version: string;
}

export default function AdminPhpManager() {
  const [activeTab, setActiveTab] = useState("versions");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // PHP Versions Tab
  const [versions, setVersions] = useState<any[]>([]);

  // PHP Accounts Tab
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountSettings, setAccountSettings] = useState<any>({});
  const [loadingSettings, setLoadingSettings] = useState(false);

  // PHP Extensions Tab
  const [selectedExtAccount, setSelectedExtAccount] = useState<string>("");
  const [extensions, setExtensions] = useState<any[]>([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);

  const fetchVersions = async () => {
    try {
      const res = await API.get("/admin/php/versions");
      if (res.data.success) {
        setVersions(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await API.get("/admin/hosting-accounts");
      if (res.data.success) {
        const list = res.data.data.data || res.data.data || [];
        setAccounts(list);
        if (list.length > 0) {
          setSelectedExtAccount(list[0].id.toString());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchVersions(), fetchAccounts()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch account settings on slide-over select
  const handleSelectAccount = async (account: Account) => {
    setSelectedAccount(account);
    setLoadingSettings(true);
    try {
      const res = await API.get(`/admin/php/${account.id}/config`);
      if (res.data.success) {
        setAccountSettings(res.data.data.settings || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await API.post(`/admin/php/${selectedAccount.id}/config`, accountSettings);
      if (res.data.success) {
        setSuccessMsg(`php.ini settings saved successfully for ${selectedAccount.domain}!`);
        setSelectedAccount(null);
        fetchAccounts();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update php.ini configurations.");
    } finally {
      setSaving(false);
    }
  };

  // Load Extensions
  const fetchExtensions = async () => {
    if (!selectedExtAccount) return;
    setLoadingExtensions(true);
    try {
      const res = await API.get(`/admin/php/${selectedExtAccount}/extensions`);
      if (res.data.success) {
        setExtensions(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExtensions(false);
    }
  };

  useEffect(() => {
    if (activeTab === "extensions") {
      fetchExtensions();
    }
  }, [selectedExtAccount, activeTab]);

  const handleToggleExtension = async (extName: string, currentlyEnabled: boolean) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await API.post(`/admin/php/${selectedExtAccount}/extensions/${extName}`, {
        enabled: !currentlyEnabled
      });
      if (res.data.success) {
        setSuccessMsg(`Extension ${extName} toggled successfully!`);
        fetchExtensions();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to toggle PHP extension.");
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.system_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <Cpu className="w-7 h-7 text-primary" />
          PHP Manager & Configurations
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor active PHP versions, update limits inside php.ini files, and toggle extension modules per virtual host.
        </p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <Check className="w-5 h-5 text-green-600 bg-green-100 rounded-full p-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 bg-red-100 rounded-full p-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4 select-none">
        <button
          onClick={() => setActiveTab("versions")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "versions" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Cpu className="w-4 h-4" />
          PHP Versions
        </button>
        <button
          onClick={() => setActiveTab("accounts")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "accounts" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Layers className="w-4 h-4" />
          Account Settings
        </button>
        <button
          onClick={() => setActiveTab("extensions")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "extensions" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Settings className="w-4 h-4" />
          PHP Extensions
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-gray-500">Querying PHP handlers telemetry...</p>
        </div>
      ) : (
        <>
          {/* Tab 1: PHP Versions */}
          {activeTab === "versions" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {versions.map((ver) => (
                <div key={ver.version} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <span className="bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      LSPHP {ver.version}
                    </span>
                    <h3 className="text-2xl font-extrabold text-gray-800 pt-2">PHP {ver.version}</h3>
                    <p className="text-xs text-gray-500 font-semibold uppercase">{ver.status}</p>
                  </div>
                  <div className="border-t border-gray-100 pt-3 text-xs font-bold text-gray-600">
                    Active Accounts: {ver.accounts_count} Users
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Account PHP Settings */}
          {activeTab === "accounts" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="relative flex-grow max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search accounts or domains..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Domain</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">PHP Engine</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 text-sm font-semibold">
                    {filteredAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-850 font-bold">{acc.domain}</td>
                        <td className="px-6 py-4 text-gray-600">{acc.system_username}</td>
                        <td className="px-6 py-4">
                          <span className="bg-gray-100 text-gray-700 font-mono text-xs px-2.5 py-1 rounded border border-gray-200">
                            PHP {acc.php_version}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleSelectAccount(acc)}
                            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                          >
                            Edit Settings
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: PHP Extensions */}
          {activeTab === "extensions" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm max-w-md">
                <Users className="w-5 h-5 text-primary" />
                <div className="flex-grow">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Target Account</label>
                  <select
                    value={selectedExtAccount}
                    onChange={(e) => setSelectedExtAccount(e.target.value)}
                    className="w-full text-xs font-bold text-gray-800 focus:outline-none bg-transparent cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.domain} ({acc.system_username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingExtensions ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  {extensions.map((ext) => (
                    <div key={ext.name} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50/50 transition-all">
                      <div className="space-y-0.5 max-w-[200px]">
                        <h4 className="text-xs font-extrabold text-gray-800 font-mono">{ext.name}</h4>
                        <p className="text-[10px] text-gray-400 font-semibold">{ext.description}</p>
                        {ext.name === 'xdebug' && (
                          <span className="text-[9px] text-red-500 font-bold uppercase animate-pulse">Dangerous</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleExtension(ext.name, ext.enabled)}
                        className={`p-1 rounded-full ${
                          ext.enabled ? "text-green-500" : "text-gray-300"
                        }`}
                      >
                        {ext.enabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* php.ini overrides slide-over panel */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-white max-w-lg w-full h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto select-text">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-150">
                <h3 className="text-sm font-bold text-gray-800">
                  php.ini Overrides: <span className="text-primary">{selectedAccount.domain}</span>
                </h3>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="text-gray-400 hover:text-gray-700 font-bold"
                >
                  ✕
                </button>
              </div>

              {loadingSettings ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSaveConfig} className="space-y-4 pt-6 text-xs font-bold text-gray-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="uppercase">Memory Limit</label>
                      <input
                        type="text"
                        value={accountSettings.memory_limit || ""}
                        onChange={(e) => setAccountSettings({...accountSettings, memory_limit: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="uppercase">Max Execution Time</label>
                      <input
                        type="number"
                        value={accountSettings.max_execution_time || ""}
                        onChange={(e) => setAccountSettings({...accountSettings, max_execution_time: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="uppercase">Upload Max Size</label>
                      <input
                        type="text"
                        value={accountSettings.upload_max_filesize || ""}
                        onChange={(e) => setAccountSettings({...accountSettings, upload_max_filesize: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="uppercase">Post Max Size</label>
                      <input
                        type="text"
                        value={accountSettings.post_max_size || ""}
                        onChange={(e) => setAccountSettings({...accountSettings, post_max_size: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="uppercase">Display Errors</label>
                    <select
                      value={accountSettings.display_errors || "Off"}
                      onChange={(e) => setAccountSettings({...accountSettings, display_errors: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-800"
                    >
                      <option value="On">On</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="uppercase">OPcache Enable</label>
                    <select
                      value={accountSettings['opcache.enable'] || "On"}
                      onChange={(e) => setAccountSettings({...accountSettings, 'opcache.enable': e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-800"
                    >
                      <option value="On">On</option>
                      <option value="Off">Off</option>
                    </select>
                  </div>

                  <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setSelectedAccount(null)}
                      className="bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg text-xs font-bold text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save Config</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
