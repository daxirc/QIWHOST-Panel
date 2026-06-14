"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  Network, 
  Plus, 
  Trash2, 
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  XCircle,
  HelpCircle,
  Zap,
  Globe,
  Mail,
  HardDrive,
  Sliders,
  Play
} from "lucide-react";

export default function CustomerDns() {
  const queryClient = useQueryClient();
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeWizardTab, setActiveWizardTab] = useState("spf");
  
  // Custom DNS Form State
  const [name, setName] = useState("@");
  const [type, setType] = useState("A");
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState("3600");
  const [priority, setPriority] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Anti-Spam Wizard Form State
  const [spfMX, setSpfMX] = useState(true);
  const [spfA, setSpfA] = useState(true);
  const [spfIpv4, setSpfIpv4] = useState("");
  const [spfFailType, setSpfFailType] = useState("softfail");
  
  const [dmarcPolicy, setDmarcPolicy] = useState("none");
  const [dmarcRua, setDmarcRua] = useState("");
  const [dmarcPct, setDmarcPct] = useState("100");
  
  const [dkimSelector, setDkimSelector] = useState("default");
  const [dkimKey, setDkimKey] = useState("");
  
  const [wizardSuccessMsg, setWizardSuccessMsg] = useState("");

  // Fetch client domains
  const { data: domainsRes } = useQuery({
    queryKey: ["customer", "domains"],
    queryFn: async () => {
      const res = await API.get("/customer/domains");
      const list = res.data.data || [];
      if (list.length > 0 && !selectedDomainId) {
        setSelectedDomainId(list[0].id.toString());
      }
      return list;
    }
  });

  const domains = Array.isArray(domainsRes) ? domainsRes : [];

  // Fetch DNS records for selected domain
  const { data: dnsRes, isLoading } = useQuery({
    queryKey: ["customer", "dns", selectedDomainId],
    queryFn: async () => {
      if (!selectedDomainId) return [];
      const res = await API.get(`/customer/dns?domain_id=${selectedDomainId}`);
      return res.data.data;
    },
    enabled: !!selectedDomainId
  });

  const dnsRecords = Array.isArray(dnsRes) ? dnsRes : [];

  // Create DNS Record Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/dns", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "dns", selectedDomainId] });
      setIsAddOpen(false);
      setName("@");
      setType("A");
      setValue("");
      setTtl("3600");
      setPriority("");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to add DNS record.");
    }
  });

  // Delete DNS Record Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/customer/dns/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "dns", selectedDomainId] });
    }
  });

  // Deploy Email Spam Protection Mutation
  const deployWizardMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post(`/customer/dns/${selectedDomainId}/email-wizard`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "dns", selectedDomainId] });
      setWizardSuccessMsg("Anti-Spam deliverability records (SPF, DMARC, DKIM) generated and deployed successfully!");
      setDkimKey("");
      setTimeout(() => setWizardSuccessMsg(""), 5000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to deploy spam settings.");
    }
  });

  const handleAddDnsRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) {
      setErrorMsg("Host name and value are required fields.");
      return;
    }
    createMutation.mutate({
      domain_id: parseInt(selectedDomainId),
      name,
      type,
      value,
      ttl: parseInt(ttl),
      priority: priority ? parseInt(priority) : null
    });
  };

  const handleDeployWizard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomainId) return;
    deployWizardMutation.mutate({
      spf_allow_mx: spfMX,
      spf_allow_a: spfA,
      spf_ipv4: spfIpv4,
      spf_fail_type: spfFailType,
      
      dmarc_policy: dmarcPolicy,
      dmarc_rua: dmarcRua,
      dmarc_pct: dmarcPct ? parseInt(dmarcPct) : null,
      
      dkim_selector: dkimSelector,
      dkim_key: dkimKey
    });
  };

  const filteredRecords = dnsRecords.filter((rec: any) => 
    rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDomainName = domains.find(d => d.id.toString() === selectedDomainId)?.domain || "Domain";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Network className="w-7 h-7 text-primary" />
            DNS Zone File Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure A records, configure mail routing servers, and build advanced spam-avoidance TXT zones.
          </p>
        </div>
        
        {/* Domain Selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <select
            value={selectedDomainId}
            onChange={(e) => setSelectedDomainId(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 shadow-sm"
          >
            <option value="">-- Select Active Domain --</option>
            {domains.map((dom: any) => (
              <option key={dom.id} value={dom.id}>
                {dom.domain}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedDomainId ? (
        <>
          {/* Main Records Block */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <span>DNS Records for {selectedDomainName}</span>
                <span className="bg-orange-50 text-primary border border-orange-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Zone Active
                </span>
              </h3>
              
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-gray-800"
                  />
                </div>
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="bg-primary hover:bg-primary-hover text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add DNS Record</span>
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400 animate-pulse">Loading DNS Zone...</div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-12 text-center text-gray-400 space-y-2">
                  <Network className="w-10 h-10 mx-auto text-gray-200" />
                  <p className="font-semibold text-gray-500">No records found matching query</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="px-6 py-3.5">Host Name</th>
                        <th className="px-6 py-3.5 text-center">Type</th>
                        <th className="px-6 py-3.5">Record Value / Target</th>
                        <th className="px-6 py-3.5 text-center">TTL</th>
                        <th className="px-6 py-3.5 text-center">Priority</th>
                        <th className="px-6 py-3.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs text-gray-700">
                      {filteredRecords.map((rec: any) => (
                        <tr key={rec.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-6 py-3.5 font-semibold text-gray-900 font-mono">
                            {rec.name}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded font-mono font-bold text-[9px] ${
                              rec.type === "A" 
                                ? "bg-blue-50 text-blue-700 border border-blue-100" 
                                : rec.type === "CNAME"
                                ? "bg-purple-50 text-purple-700 border border-purple-100"
                                : rec.type === "MX"
                                ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}>
                              {rec.type}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-mono text-gray-600 break-all max-w-xs md:max-w-md">
                            {rec.value}
                          </td>
                          <td className="px-6 py-3.5 text-center text-gray-400 font-mono">
                            {rec.ttl}
                          </td>
                          <td className="px-6 py-3.5 text-center text-gray-400 font-mono">
                            {rec.priority !== null ? rec.priority : "—"}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <button
                              onClick={() => {
                                if (confirm(`Remove this ${rec.type} record?`)) {
                                  deleteMutation.mutate(rec.id);
                                }
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Premium Deliverability Anti-Spam Protection Wizard */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden space-y-6">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600 animate-pulse" />
                  Anti-Spam Email Deliverability Shield
                </h3>
                <p className="text-xs text-gray-400">
                  Deploy SPF, DMARC, and DKIM parameters inside your DNS zone file instantly to prevent spam folders and phishing.
                </p>
              </div>
              <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Shield Status: Locked
              </span>
            </div>

            {wizardSuccessMsg && (
              <div className="mx-6 bg-green-50 border border-green-200 text-green-700 text-xs p-4 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>{wizardSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleDeployWizard} className="p-6 pt-0 space-y-6">
              {/* Wizard Tabs */}
              <div className="flex border-b border-gray-100 gap-4 text-xs font-bold tracking-wider uppercase select-none">
                <button
                  type="button"
                  onClick={() => setActiveWizardTab("spf")}
                  className={`pb-2.5 border-b-2 transition-colors ${
                    activeWizardTab === "spf" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  1. SPF Protection
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWizardTab("dmarc")}
                  className={`pb-2.5 border-b-2 transition-colors ${
                    activeWizardTab === "dmarc" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  2. DMARC Alignment Wizard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWizardTab("dkim")}
                  className={`pb-2.5 border-b-2 transition-colors ${
                    activeWizardTab === "dkim" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  3. DKIM Public Key Selector
                </button>
              </div>

              {/* TAB: SPF */}
              {activeWizardTab === "spf" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-800 text-xs">
                    <HelpCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Sender Policy Framework (SPF):</strong> Specifies which server IPs are allowed to send emails on behalf of <strong>{selectedDomainName}</strong>. Avoiding SPF leads to mail deliverability failure.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="spf_mx"
                          checked={spfMX}
                          onChange={(e) => setSpfMX(e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        <label htmlFor="spf_mx" className="text-xs font-semibold text-gray-700 select-none">
                          Trust MX Servers (Allow servers that handle my inbound email)
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="spf_a"
                          checked={spfA}
                          onChange={(e) => setSpfA(e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        <label htmlFor="spf_a" className="text-xs font-semibold text-gray-700 select-none">
                          Trust Domain A Record (Allow main web server IP address)
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Trust Extra IPv4 Addresses (Comma Separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 192.168.1.1, 10.0.0.5"
                        value={spfIpv4}
                        onChange={(e) => setSpfIpv4(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-gray-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Failure Strictness Enforcement
                      </label>
                      <select
                        value={spfFailType}
                        onChange={(e) => setSpfFailType(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-gray-800"
                      >
                        <option value="softfail">SoftFail (~all) - Accept but mark as suspicious (Recommended)</option>
                        <option value="fail">HardFail (-all) - Completely Reject unauthorized emails</option>
                        <option value="neutral">Neutral (?all) - Allow both authorized and unauthorized</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: DMARC */}
              {activeWizardTab === "dmarc" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-800 text-xs">
                    <HelpCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>DMARC Alignment Wizard:</strong> Defines what email servers should do if SPF or DKIM validation fails. Avoid spam box filters by sending deliverability feedback directly to your reporting inbox!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        DMARC Policy Enforcement Action
                      </label>
                      <select
                        value={dmarcPolicy}
                        onChange={(e) => setDmarcPolicy(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-gray-800"
                      >
                        <option value="none">None (p=none) - Monitor and report fails only</option>
                        <option value="quarantine">Quarantine (p=quarantine) - Send fails to recipient spam folder</option>
                        <option value="reject">Reject (p=reject) - Block fail emails completely at connection level</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        Reporting Email Address (RUA)
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. dmarc-reports@yourdomain.com"
                        value={dmarcRua}
                        onChange={(e) => setDmarcRua(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-gray-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Percentage of mail subject to validation (%)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 100"
                        min="1"
                        max="100"
                        value={dmarcPct}
                        onChange={(e) => setDmarcPct(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-gray-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: DKIM */}
              {activeWizardTab === "dkim" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-800 text-xs">
                    <HelpCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>DKIM Keys Selector:</strong> Attaches a cryptographic public signature record key inside your DNS zone file. When you send email, servers verify the signature to authenticate the author.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        DKIM Selector Tag Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. default or mail"
                        value={dkimSelector}
                        onChange={(e) => setDkimSelector(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-gray-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Public Key (Paste full rsa public key here)
                      </label>
                      <textarea
                        placeholder="e.g. MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
                        value={dkimKey}
                        onChange={(e) => setDkimKey(e.target.value)}
                        rows={4}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-gray-800 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Deploy button */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 italic">
                  * Deploying generates custom SPF/DMARC TXT records automatically inside active zone.
                </span>
                <button
                  type="submit"
                  disabled={deployWizardMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow flex items-center gap-2 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {deployWizardMutation.isPending ? "Deploying Shield..." : "Deploy Spam Deliverability Shield"}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-400">
          <Globe className="w-12 h-12 mx-auto text-gray-200" />
          <p className="font-semibold text-gray-500 mt-2">No domains configured inside hosting subscription</p>
          <p className="text-xs">Add a custom addon domain first inside the Domain management tab to activate DNS.</p>
        </div>
      )}

      {/* Add Custom DNS Record Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" />
                Add DNS Record
              </h2>
              <button 
                onClick={() => { setIsAddOpen(false); setErrorMsg(""); }}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddDnsRecord} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase block">Host Name</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. @ or www or mail"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-l-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                  <span className="bg-gray-100 border border-l-0 border-gray-200 text-gray-500 px-3 py-2.5 text-sm rounded-r-lg font-mono">
                    .{selectedDomainName}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase block">Record Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                >
                  <option value="A">A Record (IPv4 Address)</option>
                  <option value="AAAA">AAAA Record (IPv6 Address)</option>
                  <option value="CNAME">CNAME Record (Alias Target)</option>
                  <option value="MX">MX Record (Mail Exchange Server)</option>
                  <option value="TXT">TXT Record (Text specifications)</option>
                  <option value="NS">NS Record (Name Servers)</option>
                  <option value="SRV">SRV Record (Service port mapper)</option>
                  <option value="CAA">CAA Record (SSL/TLS cert whitelist)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase block">Record Value / Destination</label>
                <input
                  type="text"
                  placeholder={type === "A" ? "e.g. 192.168.1.1" : type === "CNAME" ? "e.g. ghs.google.com" : "e.g. v=spf1 ..."}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">TTL (Seconds)</label>
                  <input
                    type="number"
                    value={ttl}
                    onChange={(e) => setTtl(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block">Priority (For MX only)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    disabled={type !== "MX"}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
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
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md"
                >
                  Deploy Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
