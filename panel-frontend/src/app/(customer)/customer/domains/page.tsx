"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  Globe, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ShieldCheck,
  Sparkles,
  Link2,
  HardDrive,
  Search
} from "lucide-react";

export default function CustomerDomains() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch client domains
  const { data: domainsRes, isLoading } = useQuery({
    queryKey: ["customer", "domains"],
    queryFn: async () => {
      const res = await API.get("/customer/domains");
      return res.data.data;
    }
  });

  const domains = Array.isArray(domainsRes) ? domainsRes : [];

  // Fetch customer dashboard metrics to resolve dynamic active nameservers
  const { data: customerData } = useQuery({
    queryKey: ["customer", "dashboard"],
    queryFn: async () => {
      const response = await API.get("/customer/dashboard");
      return response.data.data;
    },
  });

  const ns1 = customerData?.account?.ns1 || "ns1.node1.qiwhost.com";
  const ns2 = customerData?.account?.ns2 || "ns2.node1.qiwhost.com";

  // Create Domain Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/domains", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "domains"] });
      setIsAddOpen(false);
      setDomainName("");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to add domain.");
    }
  });

  // Delete Domain Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/customer/domains/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "domains"] });
    }
  });

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName) {
      setErrorMsg("Domain name is required.");
      return;
    }
    createMutation.mutate({
      domain: domainName
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary" />
            Domains & Subdomains Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Map additional addon domains, setup sub-directories, and toggle Let's Encrypt SSL coverage.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Add Addon Domain</span>
        </button>
      </div>

      {/* Nameservers Configuration Warning Box */}
      <div className="bg-gradient-to-r from-blue-50 to-primary/5 border border-primary/20 rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          Mandatory Nameservers Configuration
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed font-semibold">
          For your hosted addon domains to resolve correctly and automatically secure themselves with Let's Encrypt SSL, point your domain registrar nameservers to:
        </p>
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm font-semibold text-gray-800">
            <span className="text-[10px] text-gray-400 font-bold uppercase">NS1:</span>
            <span>{ns1}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm font-semibold text-gray-800">
            <span className="text-[10px] text-gray-400 font-bold uppercase">NS2:</span>
            <span>{ns2}</span>
          </div>
        </div>
      </div>

      {/* Main Domains Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Retrieving hosted domains...</div>
        ) : domains.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Globe className="w-12 h-12 mx-auto text-gray-200" />
            <p className="font-semibold text-gray-500">No custom domains mapped</p>
            <p className="text-xs">Add an addon domain to host multiple sites under this account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Domain Name</th>
                  <th className="px-6 py-4">Document Root Folder</th>
                  <th className="px-6 py-4 text-center">SSL Certificate</th>
                  <th className="px-6 py-4 text-center">Mapping Type</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {domains.map((dom: any) => (
                  <tr key={dom.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {dom.domain}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                        <span>{dom.domain_root}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {dom.is_secure_with_ssl ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>HTTPS Secure</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Insecure</span>
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
                      <span className="inline-flex items-center gap-1 text-green-600 font-bold text-xs uppercase">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Remove domain mapping for ${dom.domain}?`)) {
                            deleteMutation.mutate(dom.id);
                          }
                        }}
                        disabled={dom.is_main}
                        className={`text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors ${
                          dom.is_main ? "opacity-30 cursor-not-allowed" : ""
                        }`}
                        title={dom.is_main ? "Primary domain cannot be deleted" : "Delete Domain"}
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
                Add Addon Domain
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
                  Domain Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. sub.mydomain.com or newsite.com"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                />
                <p className="text-[10px] text-gray-400 pt-1">
                  Make sure your domain DNS records (A name) point to our server IP before mapping.
                </p>
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
                  {createMutation.isPending ? "Adding..." : "Add Domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
