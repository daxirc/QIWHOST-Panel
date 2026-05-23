"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Cpu, 
  Settings, 
  ToggleLeft, 
  ToggleRight, 
  Loader2, 
  Check, 
  AlertCircle,
  FileCode,
  Globe,
  Sliders,
  ExternalLink
} from "lucide-react";
import { CustomerAPI as API } from "@/lib/api";

export default function CustomerPhpManager() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("settings");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // PHP Settings states with safe fallback defaults
  const [phpVersion, setPhpVersion] = useState("8.3");
  const [memoryLimit, setMemoryLimit] = useState(256); // MB
  const [maxExecutionTime, setMaxExecutionTime] = useState(30); // Seconds
  const [uploadMaxFilesize, setUploadMaxFilesize] = useState("64M");
  const [postMaxSize, setPostMaxSize] = useState("64M");
  const [displayErrors, setDisplayErrors] = useState(false);
  const [opcacheEnabled, setOpcacheEnabled] = useState(true);

  // PHP Extensions states
  const [extensions, setExtensions] = useState<any[]>([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await API.get("/customer/php/config");
      if (res?.data?.success) {
        const data = res.data.data || {};
        setPhpVersion(data.php_version || "8.3");
        
        const settings = data.settings || {};
        setMemoryLimit(parseInt(settings.memory_limit || "256", 10) || 256);
        setMaxExecutionTime(parseInt(settings.max_execution_time || "30", 10) || 30);
        setUploadMaxFilesize(settings.upload_max_filesize || "64M");
        setPostMaxSize(settings.post_max_size || "64M");
        setDisplayErrors(settings.display_errors === "On" || settings.display_errors === "1");
        setOpcacheEnabled(settings['opcache.enable'] === "On" || settings['opcache.enable'] === "1");
      } else {
        setErrorMsg(res?.data?.message || "Failed to retrieve PHP parameters.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to retrieve PHP parameters.");
    }
  };

  const fetchExtensions = async () => {
    setLoadingExtensions(true);
    setErrorMsg("");
    try {
      const res = await API.get("/customer/php/extensions");
      if (res?.data?.success) {
        setExtensions(res.data.data || []);
      } else {
        setErrorMsg(res?.data?.message || "Failed to query PHP extensions.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to query PHP extensions.");
    } finally {
      setLoadingExtensions(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg("");
    await fetchConfig();
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "settings") {
      loadData();
    } else if (activeTab === "extensions") {
      fetchExtensions();
    }
  }, [activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    const payload = {
      memory_limit: memoryLimit + "M",
      max_execution_time: maxExecutionTime,
      upload_max_filesize: uploadMaxFilesize,
      post_max_size: postMaxSize,
      display_errors: displayErrors ? "On" : "Off",
      'opcache.enable': opcacheEnabled ? "On" : "Off"
    };

    try {
      const res = await API.post("/customer/php/config", payload);
      if (res?.data?.success) {
        setSuccessMsg("Your custom php.ini configuration parameters saved successfully!");
        fetchConfig();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(res?.data?.message || "Failed to update PHP parameters.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to update PHP parameters.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleExtension = async (extName: string, currentlyEnabled: boolean) => {
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await API.post(`/customer/php/extensions/${extName}`, {
        enabled: !currentlyEnabled
      });
      if (res?.data?.success) {
        setSuccessMsg(`Extension ${extName} switched successfully!`);
        fetchExtensions();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(res?.data?.message || "Failed to toggle PHP extension.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to toggle PHP extension.");
    }
  };

  // Premium loading skeleton matching the main page layout
  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm lg:col-span-2 space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-150">
            <div className="h-5 w-40 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-6 w-28 bg-gray-200 animate-pulse rounded"></div>
          </div>
          {[1, 2, 3].map((n) => (
            <div key={n} className="space-y-2 pt-2">
              <div className="flex justify-between">
                <div className="h-4 w-36 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-4 w-12 bg-gray-200 animate-pulse rounded"></div>
              </div>
              <div className="h-3 w-full bg-gray-100 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit space-y-3">
        <div className="h-4 w-40 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-3 w-full bg-gray-100 animate-pulse rounded"></div>
        <div className="h-3 w-full bg-gray-100 animate-pulse rounded"></div>
      </div>
    </div>
  );

  // Graceful no-hosting-account page state
  const isNoAccountError = errorMsg === "No hosting account selected or found.";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <Cpu className="w-7 h-7 text-primary" />
          PHP Manager
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Adjust resource caps, edit user php.ini parameters, and activate PHP library extension modules inside your jailed container.
        </p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <Check className="w-5 h-5 text-green-600 bg-green-100 rounded-full p-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isNoAccountError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 bg-red-100 rounded-full p-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isNoAccountError ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm space-y-5">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No Active Hosting Account Found</h3>
          <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
            It looks like you don't have an active hosting account configured. A hosting account is required to adjust PHP settings and install library extensions.
          </p>
          <div className="pt-2">
            <button
              onClick={() => router.push("/customer/dashboard")}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 gap-4 select-none">
            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "settings" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Sliders className="w-4 h-4" />
              Current Settings
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
            <button
              onClick={() => setActiveTab("phpinfo")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "phpinfo" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <FileCode className="w-4 h-4" />
              PHP Info
            </button>
          </div>

          {loading ? (
            renderLoadingSkeleton()
          ) : (
            <>
              {/* Tab 1: Current Settings */}
              {activeTab === "settings" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <form onSubmit={handleSaveSettings} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm lg:col-span-2 space-y-6">
                    <div className="space-y-4 text-xs font-bold text-gray-500">
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm font-bold text-gray-800">Execution PHP Engine</span>
                        <span className="bg-gray-100 text-gray-700 font-mono text-xs px-2.5 py-1 rounded border border-gray-200">
                          PHP {phpVersion} (Read-only)
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="uppercase">Memory Limit (MB)</label>
                          <span className="text-primary font-bold">{memoryLimit}M</span>
                        </div>
                        <input
                          type="range"
                          min={128}
                          max={2048}
                          step={64}
                          value={memoryLimit}
                          onChange={(e) => setMemoryLimit(parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="uppercase">Max Execution Time (Seconds)</label>
                          <span className="text-primary font-bold">{maxExecutionTime}s</span>
                        </div>
                        <input
                          type="range"
                          min={30}
                          max={300}
                          step={30}
                          value={maxExecutionTime}
                          onChange={(e) => setMaxExecutionTime(parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="uppercase">Upload Max Size</label>
                          <select
                            value={uploadMaxFilesize}
                            onChange={(e) => {
                              setUploadMaxFilesize(e.target.value);
                              setPostMaxSize(e.target.value); // Auto-sync
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none text-gray-800"
                          >
                            <option value="8M">8 MB</option>
                            <option value="16M">16 MB</option>
                            <option value="32M">32 MB</option>
                            <option value="64M">64 MB</option>
                            <option value="128M">128 MB</option>
                            <option value="256M">256 MB</option>
                            <option value="512M">512 MB</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="uppercase">Post Max Size (Synced)</label>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={postMaxSize}
                            className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="uppercase text-xs">Display Errors</span>
                          <button
                            type="button"
                            onClick={() => setDisplayErrors(!displayErrors)}
                            className={`p-1 rounded-full ${
                              displayErrors ? "text-primary" : "text-gray-300"
                            }`}
                          >
                            {displayErrors ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="uppercase text-xs">OPcache Optimizer</span>
                          <button
                            type="button"
                            onClick={() => setOpcacheEnabled(!opcacheEnabled)}
                            className={`p-1 rounded-full ${
                              opcacheEnabled ? "text-primary" : "text-gray-300"
                            }`}
                          >
                            {opcacheEnabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Apply Override Parameters</span>
                      </button>
                    </div>
                  </form>

                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 h-fit">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      Jailed PHP Safeguards
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                      All custom PHP parameters are applied strictly within your jailed user php.ini context file. Modifications take effect instantly upon write inside LSWS handlers.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: PHP Extensions */}
              {activeTab === "extensions" && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-gray-800">PHP Extensions & Libraries</h3>
                  
                  {loadingExtensions ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {extensions.map((ext) => (
                        <div key={ext.name} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50/50 transition-all">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-extrabold text-gray-850 font-mono">{ext.name}</h4>
                            <p className="text-[10px] text-gray-400 font-semibold">{ext.description}</p>
                          </div>
                          <button
                            onClick={() => handleToggleExtension(ext.name, ext.enabled)}
                            className={`p-1 rounded-full ${
                              ext.enabled ? "text-primary" : "text-gray-300"
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

              {/* Tab 3: PHP Info */}
              {activeTab === "phpinfo" && (
                <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-4 max-w-lg mx-auto text-center">
                  <FileCode className="w-12 h-12 text-primary mx-auto" />
                  <h3 className="text-lg font-bold text-gray-850">Diagnostic PHP Telemetry</h3>
                  <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                    You can generate and view a diagnostic `/phpinfo.php` report showing all compiled LSPHP libraries, Zend environment flags, and open socket modules.
                  </p>
                  <div className="pt-4">
                    <a
                      href="/phpinfo.php"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md inline-flex items-center gap-1.5 transition-all"
                    >
                      <span>Launch phpinfo()</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
