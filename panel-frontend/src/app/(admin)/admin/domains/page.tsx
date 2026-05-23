"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import { 
  Globe, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ShieldCheck,
  Search,
  Sparkles,
  Link2
} from "lucide-react";

export default function AdminDomains() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Form State
  const [hostingAccountId, setHostingAccountId] = useState("");
  const [domainName, setDomainName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch domains
  const { data: domainsRes, isLoading } = useQuery({
    queryKey: ["admin", "domains"],
    queryFn: async () => {
      const res = await API.get("/admin/domains");
      return res.data.data;
    }
  });

  // Fetch accounts to populate dropdown
  const { data: accountsRes } = useQuery({
    queryKey: ["admin", "accounts"],
    queryFn: async () => {
      const res = await API.get("/admin/hosting-accounts");
      return res.data.data.data || res.data.data;
    }
  });

  const domains = Array.isArray(domainsRes) ? domainsRes : [];
  const accounts = Array.isArray(accountsRes) ? accountsRes : [];

  // Create Domain Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/admin/domains", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "domains"] });
      setIsAddOpen(false);
      setDomainName("");
      setHostingAccountId("");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to add domain.");
    }
  });

  // Delete Domain Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/admin/domains/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "domains"] });
    }
  });

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostingAccountId || !domainName) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    createMutation.mutate({
      hosting_account_id: hostingAccountId,
      domain: domainName,
      is_secure_with_ssl: false
    });
  };

  const filteredDomains = domains.filter((dom: any) => 
    dom.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dom.hosting_account?.system_username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary" />
            Domain Mapping Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Map and provision addon domains or examine subdomains bound to client virtual hosts.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add Addon Domain</span>
        </button>
      </div>

      {/* Stats Counter & Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-primary rounded-full">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Hosted Domains</h4>
            <h3 className="text-3xl font-extrabold text-gray-800">{isLoading ? "..." : domains.length}</h3>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-800"
          />
        </div>
      </div>

      {/* Domains Table / List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Loading domains...</div>
        ) : filteredDomains.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Globe className="w-12 h-12 mx-auto text-gray-200" />
            <p className="font-semibold text-gray-500">No domains discovered</p>
            <p className="text-xs">Create a new domain mapping to populate this directory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Domain Name</th>
                  <th className="px-6 py-4">Hosting Account</th>
                  <th className="px-6 py-4">Document Root</th>
                  <th className="px-6 py-4 text-center">SSL Secure</th>
                  <th className="px-6 py-4 text-center">Plan Type</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {filteredDomains.map((dom: any) => (
                  <tr key={dom.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {dom.domain}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-800">
                            {dom.hosting_account?.domain || "System Account"}
                          </p>
                          <p className="text-xs text-gray-400">
                            User: {dom.hosting_account?.system_username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {dom.domain_root}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {dom.is_secure_with_ssl ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>None</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        dom.is_main 
                          ? "bg-blue-50 text-blue-700 border border-blue-200" 
                          : "bg-purple-50 text-purple-700 border border-purple-200"
                      }`}>
                        {dom.is_main ? "Primary" : "Addon"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Terminate domain mapping for ${dom.domain}?`)) {
                            deleteMutation.mutate(dom.id);
                          }
                        }}
                        disabled={dom.is_main}
                        className={`text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors ${
                          dom.is_main ? "opacity-30 cursor-not-allowed" : ""
                        }`}
                        title={dom.is_main ? "Primary domains cannot be deleted" : "Delete Mapping"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Map Addon Domain
              </h2>
              <button 
                onClick={() => { setIsAddOpen(false); setErrorMsg(""); }}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddDomain} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Select Hosting Account
                </label>
                <select
                  value={hostingAccountId}
                  onChange={(e) => setHostingAccountId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                >
                  <option value="">-- Choose Account --</option>
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.domain} ({acc.system_username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Domain Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. blog.mydomain.com"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                />
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
                  {createMutation.isPending ? "Creating..." : "Map Domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
