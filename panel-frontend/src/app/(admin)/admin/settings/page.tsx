"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Save, 
  Globe, 
  Mail, 
  ShieldCheck, 
  Network, 
  Server, 
  Check, 
  AlertCircle,
  Loader2,
  Database,
  Cpu,
  Activity,
  HardDrive,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import { AdminAPI as API } from "@/lib/api";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Hostname SSL States
  const [sslInfo, setSslInfo] = useState<any>(null);
  const [sslJobId, setSslJobId] = useState<string | null>(null);
  const [sslStep, setSslStep] = useState(0);
  const [sslStepStatuses, setSslStepStatuses] = useState(['idle','idle','idle','idle']);
  const [sslProvisioning, setSslProvisioning] = useState(false);
  const [sslError, setSslError] = useState<string | null>(null);
  const [sslSuccess, setSslSuccess] = useState(false);
  const [showSslModal, setShowSslModal] = useState(false);

  // General settings
  const [panelName, setPanelName] = useState("");
  const [panelLogoUrl, setPanelLogoUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [defaultPhpVersion, setDefaultPhpVersion] = useState("8.3");
  const [timezone, setTimezone] = useState("UTC");

  // Nameservers settings
  const [node, setNode] = useState("node1");
  const [ns1, setNs1] = useState("ns1.node1.qiwhost.com");
  const [ns2, setNs2] = useState("ns2.node1.qiwhost.com");
  const [nsIp, setNsIp] = useState("");
  const [dnsTtl, setDnsTtl] = useState("3600");

  // Email settings
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [mailFromAddress, setMailFromAddress] = useState("");
  const [mailFromName, setMailFromName] = useState("");
  const [roundcubePath, setRoundcubePath] = useState("/webmail");

  // SSL settings
  const [letsencryptEmail, setLetsencryptEmail] = useState("");
  const [sslAutoRenew, setSslAutoRenew] = useState(true);
  const [sslCheckInterval, setSslCheckInterval] = useState("24");
  const [defaultSslProvider, setDefaultSslProvider] = useState("Let's Encrypt");

  // Hostname & Network settings
  const [serverHostname, setServerHostname] = useState("");
  const [serverNodeName, setServerNodeName] = useState("node1");
  const [serverIp, setServerIp] = useState("");
  const [panelDomain, setPanelDomain] = useState("");
  const [nameserver1, setNameserver1] = useState("");
  const [nameserver2, setNameserver2] = useState("");
  const [nameserverIp1, setNameserverIp1] = useState("");
  const [nameserverIp2, setNameserverIp2] = useState("");
  const [rdnsHostname, setRdnsHostname] = useState("");
  const [serverLocation, setServerLocation] = useState("Germany");
  const [serverDatacenter, setServerDatacenter] = useState("Hetzner");

  // Server Defaults settings
  const [defPhpVersion, setDefPhpVersion] = useState("8.3");
  const [defMemoryLimit, setDefMemoryLimit] = useState("256M");
  const [defMaxExecutionTime, setDefMaxExecutionTime] = useState("30");
  const [defUploadMaxFilesize, setDefUploadMaxFilesize] = useState("64M");
  const [defPostMaxSize, setDefPostMaxSize] = useState("64M");
  const [defEmailQuotaMb, setDefEmailQuotaMb] = useState("1024");
  const [mailServerHostname, setMailServerHostname] = useState("");
  const [dkimKeyBits, setDkimKeyBits] = useState("2048");
  const [phpDisableFunctions, setPhpDisableFunctions] = useState("");
  const [openBasedirEnabled, setOpenBasedirEnabled] = useState(true);
  const [modSecurityEnabled, setModSecurityEnabled] = useState(true);
  const [shellUploadScanEnabled, setShellUploadScanEnabled] = useState(true);
  const [defCpuLimitPercent, setDefCpuLimitPercent] = useState("25");
  const [defIoLimitMbps, setDefIoLimitMbps] = useState("10");
  const [defProcessLimit, setDefProcessLimit] = useState("20");
  const [backupRetentionDays, setBackupRetentionDays] = useState("3");
  const [backupTime, setBackupTime] = useState("02:00");
  const [backupLocation, setBackupLocation] = useState("/home/backups");
  const [wordpressAutoUpdate, setWordpressAutoUpdate] = useState(true);
  const [wordpressAutoUpdatePlugins, setWordpressAutoUpdatePlugins] = useState(true);

  // Remote Backup Server
  const [remoteBackupHost, setRemoteBackupHost] = useState("");
  const [remoteBackupPort, setRemoteBackupPort] = useState("22");
  const [remoteBackupUser, setRemoteBackupUser] = useState("root");
  const [remoteBackupPassword, setRemoteBackupPassword] = useState("");
  const [remoteBackupPath, setRemoteBackupPath] = useState("/backups");
  const [remoteBackupEnabled, setRemoteBackupEnabled] = useState(false);
  const [remoteBackupPasswordSet, setRemoteBackupPasswordSet] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState<any>(null);

  // Server Info
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loadingServerInfo, setLoadingServerInfo] = useState(false);

  // Fetch settings for active tab
  const fetchSettings = async (groupName: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await API.get(`/admin/settings/${groupName}`);
      if (res.data.success) {
        const data = res.data.data;
        if (groupName === "general") {
          setPanelName(data.panel_name || "");
          setPanelLogoUrl(data.panel_logo_url || "");
          setSupportEmail(data.support_email || "");
          setDefaultPhpVersion(data.default_php_version || "8.3");
          setTimezone(data.timezone || "UTC");
        } else if (groupName === "nameservers") {
          setNode(data.node || "node1");
          setNs1(data.ns1 || `ns1.${data.node || "node1"}.qiwhost.com`);
          setNs2(data.ns2 || `ns2.${data.node || "node1"}.qiwhost.com`);
          setNsIp(data.ns_ip || "");
          setDnsTtl(data.dns_ttl || "3600");
        } else if (groupName === "email") {
          setSmtpHost(data.smtp_host || "");
          setSmtpPort(data.smtp_port || "587");
          setMailFromAddress(data.mail_from_address || "");
          setMailFromName(data.mail_from_name || "");
          setRoundcubePath(data.roundcube_path || "/webmail");
        } else if (groupName === "ssl") {
          setLetsencryptEmail(data.letsencrypt_email || "");
          setSslAutoRenew(data.ssl_auto_renew === "1" || data.ssl_auto_renew === true);
          setSslCheckInterval(data.ssl_check_interval || "24");
          setDefaultSslProvider(data.default_ssl_provider || "Let's Encrypt");
        } else if (groupName === "hostname") {
          setServerHostname(data.server_hostname || "");
          setServerNodeName(data.server_node_name || "node1");
          setServerIp(data.server_ip || "");
          setPanelDomain(data.panel_domain || "");
          setNameserver1(data.nameserver_1 || `ns1.${data.server_node_name || "node1"}.qiwhost.com`);
          setNameserver2(data.nameserver_2 || `ns2.${data.server_node_name || "node1"}.qiwhost.com`);
          setNameserverIp1(data.nameserver_ip_1 || "");
          setNameserverIp2(data.nameserver_ip_2 || "");
          setRdnsHostname(data.rdns_hostname || "");
          setServerLocation(data.server_location || "Germany");
          setServerDatacenter(data.server_datacenter || "Hetzner");
        } else if (groupName === "server-defaults") {
          setDefPhpVersion(data.default_php_version || "8.3");
          setDefMemoryLimit(data.default_memory_limit || "256M");
          setDefMaxExecutionTime(data.default_max_execution_time || "30");
          setDefUploadMaxFilesize(data.default_upload_max_filesize || "64M");
          setDefPostMaxSize(data.default_post_max_size || "64M");
          setDefEmailQuotaMb(data.default_email_quota_mb || "1024");
          setMailServerHostname(data.mail_server_hostname || "mail.qiwhost.com");
          setDkimKeyBits(data.dkim_key_bits || "2048");
          setPhpDisableFunctions(data.php_disable_functions || "");
          setOpenBasedirEnabled(data.open_basedir_enabled === "1" || data.open_basedir_enabled === true);
          setModSecurityEnabled(data.mod_security_enabled === "1" || data.mod_security_enabled === true);
          setShellUploadScanEnabled(data.shell_upload_scan_enabled === "1" || data.shell_upload_scan_enabled === true);
          setDefCpuLimitPercent(data.default_cpu_limit_percent || "25");
          setDefIoLimitMbps(data.default_io_limit_mbps || "10");
          setDefProcessLimit(data.default_process_limit || "20");
          setBackupRetentionDays(data.backup_retention_days || "3");
          setBackupTime(data.backup_time || "02:00");
          setBackupLocation(data.backup_location || "/home/backups");
          setWordpressAutoUpdate(data.wordpress_auto_update === "1" || data.wordpress_auto_update === true);
          setWordpressAutoUpdatePlugins(data.wordpress_auto_update_plugins === "1" || data.wordpress_auto_update_plugins === true);
        }
      }

      // Load remote backup settings
      try {
        const backupRes = await API.get("/admin/settings/backup");
        if (backupRes.data.success) {
          const bd = backupRes.data.data;
          setRemoteBackupHost(bd.backup_remote_host || "");
          setRemoteBackupPort(bd.backup_remote_port || "22");
          setRemoteBackupUser(bd.backup_remote_user || "root");
          setRemoteBackupPath(bd.backup_remote_path || "/backups");
          setRemoteBackupEnabled(bd.backup_remote_enabled === "1");
          setAutoBackupEnabled(bd.backup_auto_enabled === "1");
          setRemoteBackupPasswordSet(bd.backup_remote_password_set || false);
        }
      } catch {}
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to retrieve system settings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchServerInfo = async () => {
    setLoadingServerInfo(true);
    setErrorMsg("");
    try {
      const res = await API.get("/admin/settings/server-info");
      if (res.data.success) {
        setServerInfo(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load server diagnostic telemetry.");
    } finally {
      setLoadingServerInfo(false);
    }
  };

  useEffect(() => {
    if (activeTab === "server-info") {
      fetchServerInfo();
    } else {
      fetchSettings(activeTab);
    }
  }, [activeTab]);

  // Fetch current SSL info on load
  useEffect(() => {
    API.get('/admin/settings/hostname-ssl/info').then(res => {
      if (res.data.success) setSslInfo(res.data.data);
    }).catch(err => console.error(err));

    API.get('/admin/settings/hostname').then(res => {
      if (res.data.success) setServerHostname(res.data.data.server_hostname || "");
    }).catch(err => console.error(err));
  }, []);

  // Poll SSL job status
  useEffect(() => {
    if (!sslJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await API.get(`/admin/settings/hostname-ssl/status?job_id=${sslJobId}`);
        const data = res.data.data;

        setSslStep(data.step);

        const newStatuses = ['idle','idle','idle','idle'];
        for (let i = 0; i < 4; i++) {
          if (i + 1 < data.step) newStatuses[i] = 'done';
          else if (i + 1 === data.step) newStatuses[i] = data.status === 'failed' ? 'failed' : 'processing';
          else newStatuses[i] = 'idle';
        }
        setSslStepStatuses(newStatuses);

        if (data.status === 'complete') {
          setSslSuccess(true);
          setSslProvisioning(false);
          setSslJobId(null);
          clearInterval(interval);
          
          // Refresh SSL info
          const infoRes = await API.get('/admin/settings/hostname-ssl/info');
          if (infoRes.data.success) setSslInfo(infoRes.data.data);
        }

        if (data.status === 'failed') {
          setSslError(data.error);
          setSslProvisioning(false);
          setSslJobId(null);
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [sslJobId]);

  const handleProvisionHostnameSsl = async () => {
    setSslProvisioning(true);
    setSslError(null);
    setSslSuccess(false);
    setSslStepStatuses(['processing','idle','idle','idle']);

    try {
      const hostnameRes = await API.get('/admin/settings/hostname');
      const hostname = hostnameRes.data.data.server_hostname;
      
      const sslSettingsRes = await API.get('/admin/settings/ssl');
      const email = sslSettingsRes.data.data.letsencrypt_email || 'admin@qiwhost.com';

      if (!hostname) {
        throw new Error("Server hostname is not configured yet. Please configure it in the Hostname & Network tab.");
      }

      const res = await API.post('/admin/settings/hostname-ssl/provision', {
        hostname,
        email,
      });

      if (res.data.success) {
        setSslJobId(res.data.data.job_id);
      } else {
        setSslError(res.data.message);
        setSslProvisioning(false);
      }
    } catch (err: any) {
      setSslError(err.response?.data?.message || err.message || 'Failed to start SSL provisioning');
      setSslProvisioning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    let payload = {};
    if (activeTab === "general") {
      payload = {
        panel_name: panelName,
        panel_logo_url: panelLogoUrl,
        support_email: supportEmail,
        default_php_version: defaultPhpVersion,
        timezone
      };
    } else if (activeTab === "nameservers") {
      payload = {
        node,
        ns_ip: nsIp,
        dns_ttl: dnsTtl,
        ns1,
        ns2
      };
    } else if (activeTab === "email") {
      payload = {
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        mail_from_address: mailFromAddress,
        mail_from_name: mailFromName,
        roundcube_path: roundcubePath
      };
    } else if (activeTab === "ssl") {
      payload = {
        letsencrypt_email: letsencryptEmail,
        ssl_auto_renew: sslAutoRenew ? "1" : "0",
        ssl_check_interval: sslCheckInterval,
        default_ssl_provider: defaultSslProvider
      };
    } else if (activeTab === "hostname") {
      payload = {
        server_hostname: serverHostname,
        server_node_name: serverNodeName,
        panel_domain: panelDomain,
        nameserver_ip_1: nameserverIp1,
        nameserver_ip_2: nameserverIp2,
        rdns_hostname: rdnsHostname,
        server_location: serverLocation,
        server_datacenter: serverDatacenter
      };
    } else if (activeTab === "server-defaults") {
      payload = {
        default_php_version: defPhpVersion,
        default_memory_limit: defMemoryLimit,
        default_max_execution_time: defMaxExecutionTime,
        default_upload_max_filesize: defUploadMaxFilesize,
        default_post_max_size: defPostMaxSize,
        default_email_quota_mb: defEmailQuotaMb,
        mail_server_hostname: mailServerHostname,
        dkim_key_bits: dkimKeyBits,
        php_disable_functions: phpDisableFunctions,
        open_basedir_enabled: openBasedirEnabled ? "1" : "0",
        mod_security_enabled: modSecurityEnabled ? "1" : "0",
        shell_upload_scan_enabled: shellUploadScanEnabled ? "1" : "0",
        default_cpu_limit_percent: defCpuLimitPercent,
        default_io_limit_mbps: defIoLimitMbps,
        default_process_limit: defProcessLimit,
        backup_retention_days: backupRetentionDays,
        backup_time: backupTime,
        backup_location: backupLocation,
        wordpress_auto_update: wordpressAutoUpdate ? "1" : "0",
        wordpress_auto_update_plugins: wordpressAutoUpdatePlugins ? "1" : "0"
      };
    }

    try {
      const res = await API.post(`/admin/settings/${activeTab}`, payload);
      if (res.data.success) {
        setSuccessMsg(`Global ${activeTab} configurations saved successfully!`);
        setTimeout(() => setSuccessMsg(""), 4000);
        // Refresh values
        if (activeTab === "nameservers") {
          const updatedNode = payload as any;
          setNs1(`ns1.${updatedNode.node}.qiwhost.com`);
          setNs2(`ns2.${updatedNode.node}.qiwhost.com`);
        } else if (activeTab === "hostname") {
          const updated = res.data.data;
          setServerIp(updated.server_ip || "");
          setNameserver1(updated.nameserver_1 || "");
          setNameserver2(updated.nameserver_2 || "");
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to persist setting changes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary" />
          Global Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure hostname bindings, default server quotas, security sandboxing, nameservers, and global panel limits.
        </p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm font-semibold">
          <Check className="w-5 h-5 text-green-600 bg-green-100 rounded-full p-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm font-semibold">
          <AlertCircle className="w-5 h-5 text-red-600 bg-red-100 rounded-full p-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4 select-none flex-wrap font-semibold">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "general" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-650"
          }`}
        >
          <Globe className="w-4 h-4" />
          General
        </button>
        <button
          onClick={() => setActiveTab("hostname")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "hostname" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-650"
          }`}
        >
          <Network className="w-4 h-4" />
          Hostname & Network
        </button>
        <button
          onClick={() => setActiveTab("server-defaults")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "server-defaults" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-650"
          }`}
        >
          <Cpu className="w-4 h-4" />
          Server Defaults
        </button>
        <button
          onClick={() => setActiveTab("nameservers")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "nameservers" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-650"
          }`}
        >
          <Network className="w-4 h-4" />
          Nameservers
        </button>
        <button
          onClick={() => setActiveTab("email")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "email" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-650"
          }`}
        >
          <Mail className="w-4 h-4" />
          Relay & SMTP
        </button>
        <button
          onClick={() => setActiveTab("ssl")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "ssl" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-650"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          SSL Param
        </button>
        <button
          onClick={() => setActiveTab("backup")}
          className={`pb-3 text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "backup" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-650"
          }`}
        >
          <HardDrive className="w-4 h-4" />
          Backup Server
        </button>
      </div>

      {loading && !successMsg && !errorMsg ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center space-y-4 max-w-3xl">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-gray-500 font-semibold">Loading configurations from DB...</p>
        </div>
      ) : (
        /* Settings Forms */
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-3xl space-y-6 font-semibold text-sm">
          
          {/* Tab: General */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                General Portal Parameters
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Panel Brand Name</label>
                  <input
                    type="text"
                    required
                    value={panelName}
                    onChange={(e) => setPanelName(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Support Contact Email</label>
                  <input
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Panel Brand Logo URL</label>
                  <input
                    type="text"
                    value={panelLogoUrl}
                    onChange={(e) => setPanelLogoUrl(e.target.value)}
                    placeholder="e.g. https://domain.com/logo.png"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Default Hosting PHP Engine</label>
                  <select
                    value={defaultPhpVersion}
                    onChange={(e) => setDefaultPhpVersion(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  >
                    <option value="8.0">PHP 8.0</option>
                    <option value="8.1">PHP 8.1</option>
                    <option value="8.2">PHP 8.2</option>
                    <option value="8.3">PHP 8.3 (Recommended)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">System Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="GMT">GMT (Greenwich Mean Time)</option>
                    <option value="EST">EST (Eastern Standard Time)</option>
                    <option value="PST">PST (Pacific Standard Time)</option>
                    <option value="Asia/Karachi">Asia/Karachi (+05:00)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Hostname & Network */}
          {activeTab === "hostname" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Network className="w-4 h-4 text-primary" />
                Hostname & Network Infrastructure Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Server Hostname</label>
                  <input
                    type="text"
                    required
                    value={serverHostname}
                    onChange={(e) => setServerHostname(e.target.value)}
                    placeholder="e.g. server1.qiwhost.com"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Server Node Name</label>
                  <input
                    type="text"
                    required
                    value={serverNodeName}
                    onChange={(e) => {
                      setServerNodeName(e.target.value);
                      setNameserver1(`ns1.${e.target.value}.qiwhost.com`);
                      setNameserver2(`ns2.${e.target.value}.qiwhost.com`);
                    }}
                    placeholder="e.g. node1"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Panel Domain</label>
                  <input
                    type="text"
                    required
                    value={panelDomain}
                    onChange={(e) => setPanelDomain(e.target.value)}
                    placeholder="e.g. panel.qiwhost.com"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block flex items-center gap-1">
                    <span>Server IP (Read-only)</span>
                    <button
                      type="button"
                      onClick={fetchServerInfo}
                      className="text-primary hover:text-primary-hover hover:rotate-180 transition-transform duration-300"
                      title="Auto Detect IP"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={serverIp || "127.0.0.1"}
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Primary Nameserver IP</label>
                  <input
                    type="text"
                    value={nameserverIp1}
                    onChange={(e) => setNameserverIp1(e.target.value)}
                    placeholder="e.g. Same as server IP"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Secondary Nameserver IP</label>
                  <input
                    type="text"
                    value={nameserverIp2}
                    onChange={(e) => setNameserverIp2(e.target.value)}
                    placeholder="e.g. Secondary DNS node IP"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 block">Primary Nameserver (Auto Filled)</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={nameserver1}
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 block">Secondary Nameserver (Auto Filled)</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={nameserver2}
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Reverse DNS (rDNS) Hostname</label>
                  <input
                    type="text"
                    value={rdnsHostname}
                    onChange={(e) => setRdnsHostname(e.target.value)}
                    placeholder="e.g. server1.qiwhost.com"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Datacenter / Vendor</label>
                  <input
                    type="text"
                    value={serverDatacenter}
                    onChange={(e) => setServerDatacenter(e.target.value)}
                    placeholder="e.g. Hetzner, OVH"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Server Location</label>
                  <select
                    value={serverLocation}
                    onChange={(e) => setServerLocation(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  >
                    <option value="Germany">Germany (Helsinki/Falkenstein)</option>
                    <option value="Finland">Finland (Helsinki)</option>
                    <option value="US East">United States (Virginia)</option>
                    <option value="US West">United States (Oregon)</option>
                    <option value="UK">United Kingdom (London)</option>
                    <option value="Netherlands">Netherlands (Amsterdam)</option>
                    <option value="Singapore">Singapore (Jurong)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Server Defaults */}
          {activeTab === "server-defaults" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Cpu className="w-4 h-4 text-primary" />
                Server Default Quotas & Limits (New Accounts)
              </h3>

              {/* PHP settings */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">PHP Performance Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Default PHP Version</label>
                    <select
                      value={defPhpVersion}
                      onChange={(e) => setDefPhpVersion(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    >
                      <option value="8.0">PHP 8.0</option>
                      <option value="8.1">PHP 8.1</option>
                      <option value="8.2">PHP 8.2</option>
                      <option value="8.3">PHP 8.3 (LTS)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Memory Limit</label>
                    <input
                      type="text"
                      value={defMemoryLimit}
                      onChange={(e) => setDefMemoryLimit(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Max Execution Time (Sec)</label>
                    <input
                      type="number"
                      value={defMaxExecutionTime}
                      onChange={(e) => setDefMaxExecutionTime(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Upload Max Filesize</label>
                    <input
                      type="text"
                      value={defUploadMaxFilesize}
                      onChange={(e) => setDefUploadMaxFilesize(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Post Max Size</label>
                    <input
                      type="text"
                      value={defPostMaxSize}
                      onChange={(e) => setDefPostMaxSize(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Email / SMTP settings */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Mailbox Service Defaults</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Default Email Quota (MB)</label>
                    <input
                      type="number"
                      value={defEmailQuotaMb}
                      onChange={(e) => setDefEmailQuotaMb(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Outgoing SMTP Hostname</label>
                    <input
                      type="text"
                      value={mailServerHostname}
                      onChange={(e) => setMailServerHostname(e.target.value)}
                      placeholder="e.g. mail.qiwhost.com"
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Resource limits */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">OS Jailed Resource Limits</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">CPU Limit (%)</label>
                    <input
                      type="number"
                      value={defCpuLimitPercent}
                      onChange={(e) => setDefCpuLimitPercent(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">IO Limit (MB/s)</label>
                    <input
                      type="number"
                      value={defIoLimitMbps}
                      onChange={(e) => setDefIoLimitMbps(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Max Concurrent Processes</label>
                    <input
                      type="number"
                      value={defProcessLimit}
                      onChange={(e) => setDefProcessLimit(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Security & Sandboxing */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Security Sandboxing Policies</h4>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 block uppercase">PHP Disabled Functions (disable_functions)</label>
                  <textarea
                    rows={2}
                    value={phpDisableFunctions}
                    onChange={(e) => setPhpDisableFunctions(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-mono"
                    placeholder="exec,passthru,shell_exec,system..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="open_basedir_enabled"
                      checked={openBasedirEnabled}
                      onChange={(e) => setOpenBasedirEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-primary h-4.5 w-4.5"
                    />
                    <label htmlFor="open_basedir_enabled" className="text-sm font-semibold text-gray-700 select-none">
                      Enforce PHP `open_basedir` Isolations
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="mod_security_enabled"
                      checked={modSecurityEnabled}
                      onChange={(e) => setModSecurityEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-primary h-4.5 w-4.5"
                    />
                    <label htmlFor="mod_security_enabled" className="text-sm font-semibold text-gray-700 select-none">
                      Enable ModSecurity Web Application Firewall (WAF)
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="shell_upload_scan_enabled"
                      checked={shellUploadScanEnabled}
                      onChange={(e) => setShellUploadScanEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-primary h-4.5 w-4.5"
                    />
                    <label htmlFor="shell_upload_scan_enabled" className="text-sm font-semibold text-gray-700 select-none">
                      Proactive Malware Shell Scanning (Real-time Uploads)
                    </label>
                  </div>
                </div>
              </div>

              {/* WordPress defaults */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">WordPress Toolkit Policies</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="wp_auto_update"
                      checked={wordpressAutoUpdate}
                      onChange={(e) => setWordpressAutoUpdate(e.target.checked)}
                      className="rounded border-gray-300 text-primary h-4.5 w-4.5"
                    />
                    <label htmlFor="wp_auto_update" className="text-sm font-semibold text-gray-700 select-none">
                      Enable WP Core Auto Upgrades
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="wp_auto_update_plugins"
                      checked={wordpressAutoUpdatePlugins}
                      onChange={(e) => setWordpressAutoUpdatePlugins(e.target.checked)}
                      className="rounded border-gray-300 text-primary h-4.5 w-4.5"
                    />
                    <label htmlFor="wp_auto_update_plugins" className="text-sm font-semibold text-gray-700 select-none">
                      Enable WP Plugins Auto Upgrades
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nameservers */}
          {activeTab === "nameservers" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Network className="w-4 h-4 text-primary" />
                Cluster Nameserver Bindings & Node Mapping
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Nameserver Cluster Node</label>
                  <input
                    type="text"
                    required
                    value={node}
                    onChange={(e) => {
                      setNode(e.target.value);
                      setNs1(`ns1.${e.target.value}.qiwhost.com`);
                      setNs2(`ns2.${e.target.value}.qiwhost.com`);
                    }}
                    placeholder="e.g. node1, node2"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Nameserver Primary IP</label>
                  <input
                    type="text"
                    required
                    value={nsIp}
                    onChange={(e) => setNsIp(e.target.value)}
                    placeholder="e.g. 192.168.1.1"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">NS TTL Duration (Seconds)</label>
                  <input
                    type="number"
                    required
                    value={dnsTtl}
                    onChange={(e) => setDnsTtl(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Nameserver 1</label>
                  <input
                    type="text"
                    required
                    value={ns1}
                    onChange={(e) => setNs1(e.target.value)}
                    placeholder="ns1.node.qiwhost.com"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Nameserver 2</label>
                  <input
                    type="text"
                    required
                    value={ns2}
                    onChange={(e) => setNs2(e.target.value)}
                    placeholder="ns2.node.qiwhost.com"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: SMTP */}
          {activeTab === "email" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                SMTP Host Relay & Mailbox Paths
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">SMTP Hostname / Relay</label>
                  <input
                    type="text"
                    required
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="e.g. localhost"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">SMTP Port</label>
                  <input
                    type="text"
                    required
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="e.g. 587"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Sender Mail Address (From)</label>
                  <input
                    type="email"
                    required
                    value={mailFromAddress}
                    onChange={(e) => setMailFromAddress(e.target.value)}
                    placeholder="noreply@qiwhost.com"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Sender Display Name</label>
                  <input
                    type="text"
                    required
                    value={mailFromName}
                    onChange={(e) => setMailFromName(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Roundcube Webmail Endpoint</label>
                  <input
                    type="text"
                    required
                    value={roundcubePath}
                    onChange={(e) => setRoundcubePath(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: SSL */}
          {activeTab === "ssl" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                SSL Generation & Renewal Parameters
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Let's Encrypt Contact Email</label>
                  <input
                    type="email"
                    required
                    value={letsencryptEmail}
                    onChange={(e) => setLetsencryptEmail(e.target.value)}
                    placeholder="admin@qiwhost.com"
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">SSL Check Cron Interval (Hours)</label>
                  <input
                    type="number"
                    required
                    value={sslCheckInterval}
                    onChange={(e) => setSslCheckInterval(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Default Certificate Authority</label>
                  <select
                    value={defaultSslProvider}
                    onChange={(e) => setDefaultSslProvider(e.target.value)}
                    className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  >
                    <option value="Let's Encrypt">Let's Encrypt</option>
                    <option value="Self-Signed">Self-Signed</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="ssl_auto_renew"
                    checked={sslAutoRenew}
                    onChange={(e) => setSslAutoRenew(e.target.checked)}
                    className="rounded border-gray-300 text-primary h-4.5 w-4.5"
                  />
                  <label htmlFor="ssl_auto_renew" className="text-sm font-semibold text-gray-700 select-none">
                    Automatically Renew Certificates
                  </label>
                </div>
              </div>

              <hr className="border-gray-150 my-6" />

              {/* Hostname SSL Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      Panel Hostname Let's Encrypt SSL
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Provision and apply a Let's Encrypt certificate directly on your server hostname for HTTPS management.
                    </p>
                  </div>
                  {/* Current SSL Status Badge */}
                  {sslInfo?.status === 'active' ? (
                    <span className="px-2.5 py-1 bg-green-50 text-green-600 border border-green-200 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                      <span>Secure & Active</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-red-50 text-red-655 border border-red-200 rounded-full text-xs font-bold">
                      Not Configured
                    </span>
                  )}
                </div>

                {/* SSL Info if active */}
                {sslInfo?.status === 'active' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-green-50/50 border border-green-100 rounded-xl">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">Secure Domain</div>
                      <div className="font-mono text-xs font-bold text-gray-800 mt-0.5">{sslInfo.domain}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">Expiration Date</div>
                      <div className="text-xs font-bold text-gray-700 mt-0.5">{sslInfo.expires_at}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">Auto Renewal Status</div>
                      <div className="text-xs font-bold text-green-600 mt-0.5 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Enabled & Scheduled</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hostname display */}
                <div className="mb-4 p-3.5 bg-gray-50/80 border border-gray-150 rounded-xl flex items-center gap-3">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Active Hostname:</span>
                  <span className="font-mono text-sm font-bold text-gray-800 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm">
                    {serverHostname || 'Not configured yet'}
                  </span>
                </div>

                {/* Important Note */}
                <div className="mb-6 p-4 bg-amber-50/70 border border-amber-100 rounded-xl text-xs text-amber-800 leading-relaxed font-semibold">
                  ⚠️ <strong className="text-amber-900 font-bold">Important:</strong> Before starting the SSL request, ensure your domain DNS glue records successfully point <code>{serverHostname || '(your hostname)'}</code> to this server IP address. Note that OLS services will reload briefly to apply the cert (~30 seconds).
                </div>

                {/* Provision Button */}
                <button
                  type="button"
                  onClick={() => setShowSslModal(true)}
                  disabled={sslProvisioning}
                  className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  {sslInfo?.status === 'active'
                    ? '🔄 Renew / Reinstall Let\'s Encrypt SSL'
                    : '🔒 Provision Let\'s Encrypt SSL'}
                </button>
              </div>

              {/* SSL Provisioning Modal */}
              {showSslModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-bold text-gray-855 mb-6 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary animate-pulse" />
                      Hostname SSL Installer
                    </h3>

                    {/* Steps */}
                    {[
                      'Verifying hostname DNS settings',
                      'Requesting Let\'s Encrypt certificate',
                      'Configuring OpenLiteSpeed secure listener',
                      'Updating panel configurations to HTTPS',
                    ].map((label, i) => (
                      <div key={i} className="flex items-center gap-4 mb-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all
                          ${sslStepStatuses[i] === 'done' ? 'bg-green-50 border-green-200 text-green-600 font-bold' :
                            sslStepStatuses[i] === 'processing' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 font-bold animate-pulse' :
                            sslStepStatuses[i] === 'failed' ? 'bg-red-50 border-red-200 text-red-650 font-bold' :
                            'bg-gray-50 border-gray-150 text-gray-400'}`}>
                          {i + 1}
                        </div>
                        <span className={`text-xs font-semibold transition-colors
                          ${sslStepStatuses[i] === 'done' ? 'text-green-600 font-bold' :
                            sslStepStatuses[i] === 'processing' ? 'text-indigo-600 font-extrabold' :
                            sslStepStatuses[i] === 'failed' ? 'text-red-650 font-bold' :
                            'text-gray-400'}`}>
                          {label}
                        </span>
                        <div className="ml-auto text-sm">
                          {sslStepStatuses[i] === 'done' && <span>✅</span>}
                          {sslStepStatuses[i] === 'processing' && <span className="animate-spin inline-block">⏳</span>}
                          {sslStepStatuses[i] === 'failed' && <span>❌</span>}
                        </div>
                      </div>
                    ))}

                    {/* Error */}
                    {sslError && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-150 rounded-xl animate-in slide-in-from-top-2 duration-300">
                        <div className="text-red-700 font-bold text-xs mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>SSL Request Failed!</span>
                        </div>
                        <div className="text-red-600 text-[10px] font-mono leading-relaxed max-h-32 overflow-y-auto mt-1 p-2 bg-white border border-red-100 rounded-lg">{sslError}</div>
                      </div>
                    )}

                    {/* Success */}
                    {sslSuccess && (
                      <div className="mt-4 p-5 bg-green-50 border border-green-150 rounded-xl text-center animate-in slide-in-from-top-2 duration-300">
                        <div className="text-2xl mb-1.5">🎉</div>
                        <div className="text-green-700 font-bold text-sm">SSL Provisioned Successfully!</div>
                        <div className="text-green-600 text-xs mt-1 font-semibold leading-relaxed">
                          Your control panel is now secured with Let's Encrypt SSL and accessible via secure HTTPS protocols.
                        </div>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="mt-8 flex gap-3">
                      {!sslProvisioning && !sslSuccess && (
                        <button
                          type="button"
                          onClick={handleProvisionHostnameSsl}
                          className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover shadow-md hover:shadow-lg transition cursor-pointer text-xs"
                        >
                          Start Provisioning
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowSslModal(false);
                          setSslError(null);
                          setSslSuccess(false);
                          setSslStepStatuses(['idle','idle','idle','idle']);
                          setSslProvisioning(false);
                          setSslJobId(null);
                        }}
                        className="flex-1 bg-gray-150 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition cursor-pointer text-xs"
                      >
                        {sslSuccess ? 'Close' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Backup Server Tab */}
          {activeTab === "backup" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />
                Remote Backup Server Configuration
              </h3>
              <p className="text-sm text-gray-500">Configure your remote VPS for storing backups via SFTP. Backups are retained for the specified number of days and automatically cleaned up.</p>

              {/* Schedule Settings */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Backup Schedule</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Retention Period (Days)</label>
                    <input
                      type="number"
                      value={backupRetentionDays}
                      onChange={(e) => setBackupRetentionDays(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Daily Execution Time</label>
                    <input
                      type="text"
                      value={backupTime}
                      onChange={(e) => setBackupTime(e.target.value)}
                      placeholder="e.g. 02:00"
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Local Backup Directory</label>
                    <input
                      type="text"
                      value={backupLocation}
                      onChange={(e) => setBackupLocation(e.target.value)}
                      className="w-full bg-gray-55 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Remote Server Config */}
              <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4">
                <h4 className="font-bold text-xs text-blue-700 uppercase tracking-wider">Remote Backup VPS (SFTP Connection)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Remote Host (IP Address)</label>
                    <input
                      type="text"
                      value={remoteBackupHost}
                      onChange={(e) => setRemoteBackupHost(e.target.value)}
                      placeholder="e.g. 192.168.1.100"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">SSH Port</label>
                    <input
                      type="number"
                      value={remoteBackupPort}
                      onChange={(e) => setRemoteBackupPort(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">SSH Username</label>
                    <input
                      type="text"
                      value={remoteBackupUser}
                      onChange={(e) => setRemoteBackupUser(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">
                      SSH Password {remoteBackupPasswordSet && <span className="text-green-600 ml-1">(Saved ✓)</span>}
                    </label>
                    <input
                      type="password"
                      value={remoteBackupPassword}
                      onChange={(e) => setRemoteBackupPassword(e.target.value)}
                      placeholder={remoteBackupPasswordSet ? "••••••••  (leave blank to keep)" : "Enter password"}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 block uppercase">Remote Storage Path</label>
                    <input
                      type="text"
                      value={remoteBackupPath}
                      onChange={(e) => setRemoteBackupPath(e.target.value)}
                      placeholder="/backups"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono"
                    />
                  </div>
                  <div className="flex items-end gap-5 pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={remoteBackupEnabled} onChange={(e) => setRemoteBackupEnabled(e.target.checked)} className="rounded" />
                      <span className="text-xs font-bold text-gray-600">Enable Remote Storage</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={autoBackupEnabled} onChange={(e) => setAutoBackupEnabled(e.target.checked)} className="rounded" />
                      <span className="text-xs font-bold text-gray-600">Enable Auto Backups</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-blue-100">
                  <button
                    type="button"
                    onClick={async () => {
                      setTestConnectionResult(null);
                      setTestingConnection(true);
                      try {
                        const res = await API.post("/admin/backups/test-connection", {
                          host: remoteBackupHost, port: parseInt(remoteBackupPort),
                          user: remoteBackupUser, password: remoteBackupPassword || "placeholder",
                          path: remoteBackupPath,
                        });
                        setTestConnectionResult(res.data.success ? { success: true, message: res.data.message } : { success: false, message: res.data.message });
                      } catch (err: any) {
                        setTestConnectionResult({ success: false, message: err.response?.data?.message || "Connection failed" });
                      } finally { setTestingConnection(false); }
                    }}
                    disabled={testingConnection || !remoteBackupHost}
                    className="px-4 py-2.5 border border-blue-300 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 disabled:opacity-50 transition-colors"
                  >
                    {testingConnection ? "Testing..." : "🔌 Test Connection"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await API.post("/admin/settings/backup", {
                          backup_remote_host: remoteBackupHost,
                          backup_remote_port: remoteBackupPort,
                          backup_remote_user: remoteBackupUser,
                          backup_remote_password: remoteBackupPassword || "••••••••",
                          backup_remote_path: remoteBackupPath,
                          backup_remote_enabled: remoteBackupEnabled ? "1" : "0",
                          backup_auto_enabled: autoBackupEnabled ? "1" : "0",
                        });
                        setRemoteBackupPasswordSet(true);
                        setSuccessMsg("Backup server settings saved successfully!");
                      } catch (err: any) {
                        setErrorMsg(err.response?.data?.message || "Failed to save backup settings.");
                      }
                    }}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    💾 Save Backup Server Settings
                  </button>
                  {testConnectionResult && (
                    <span className={`text-xs font-bold ${testConnectionResult.success ? "text-green-600" : "text-red-600"}`}>
                      {testConnectionResult.success ? "✓" : "✗"} {testConnectionResult.message}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Save button footer */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace("-", " ")} Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
