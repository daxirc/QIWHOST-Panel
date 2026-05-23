"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Search,
  Sparkles,
  CheckCircle,
  XCircle,
  Calendar,
  Zap,
  Globe
} from "lucide-react";

export default function AdminSsl() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  
  // Form State
  const [domainId, setDomainId] = useState("");
  const [provider, setProvider] = useState("Let's Encrypt");
  const [isWildcard, setIsWildcard] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch certificates
  const { data: certsRes, isLoading } = useQuery({
    queryKey: ["admin", "ssl"],
    queryFn: async () => {
      const res = await API.get("/admin/ssl");
      return res.data.data;
    }
  });

  // Fetch domains (addon and main) to select for installation
  const { data: domainsRes } = useQuery({
    queryKey: ["admin", "domains"],
    queryFn: async () => {
      const res = await API.get("/admin/domains");
      return res.data.data;
    }
  });

  const certs = Array.isArray(certsRes) ? certsRes : [];
  const domains = Array.isArray(domainsRes) ? domainsRes : [];

  // Install SSL Mutation
  const installMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number, payload: any }) => {
      const res = await API.post(`/admin/ssl/${id}/install`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ssl"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "domains"] });
      setIsInstallOpen(false);
      setDomainId("");
      setIsWildcard(false);
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to provision SSL certificate.");
    }
  });

  const handleInstallSsl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainId) {
      setErrorMsg("Please select a domain.");
      return;
    }
    installMutation.mutate({
      id: parseInt(domainId),
      payload: {
        provider: provider,
        is_wildcard: isWildcard
      }
    });
  };

  const filteredCerts = certs.filter((cert: any) => 
    cert.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            SSL Certificate Vault
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Provision Let's Encrypt certificates, enforce HTTPS redirects, and manage TLS encryption chains.
          </p>
        </div>
        <button
          onClick={() => setIsInstallOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Provision Certificate</span>
        </button>
      </div>

      {/* Stats Counter & Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-primary rounded-full">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Certificates</h4>
            <h3 className="text-3xl font-extrabold text-gray-800">{isLoading ? "..." : certs.length}</h3>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search certificates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-800"
          />
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Loading certificates...</div>
        ) : filteredCerts.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <ShieldCheck className="w-12 h-12 mx-auto text-gray-200" />
            <p className="font-semibold text-gray-500">No SSL certificates discovered</p>
            <p className="text-xs">Secure a domain with an SSL/TLS certificate to enable HTTPS.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Domain Name</th>
                  <th className="px-6 py-4">Security Provider</th>
                  <th className="px-6 py-4">Expiration Date</th>
                  <th className="px-6 py-4 text-center">Type</th>
                  <th className="px-6 py-4 text-center">Auto Renew</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {filteredCerts.map((cert: any) => (
                  <tr key={cert.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span>{cert.domain}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {cert.provider}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(cert.expiration_date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        cert.is_wildcard 
                          ? "bg-purple-50 text-purple-700 border border-purple-200" 
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}>
                        {cert.is_wildcard ? "Wildcard" : "Single"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {cert.is_auto_renew ? (
                        <span className="text-green-600 font-bold text-xs uppercase flex items-center justify-center gap-1">
                          <Zap className="w-3 h-3 animate-bounce" />
                          Enabled
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {cert.is_active ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Expired</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Certificate Modal */}
      {isInstallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Deploy SSL / TLS Cert
              </h2>
              <button 
                onClick={() => { setIsInstallOpen(false); setErrorMsg(""); }}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleInstallSsl} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Select Domain to Encrypt
                </label>
                <select
                  value={domainId}
                  onChange={(e) => setDomainId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                >
                  <option value="">-- Choose Domain --</option>
                  {domains.map((dom: any) => (
                    <option key={dom.id} value={dom.id}>
                      {dom.domain} (Account: {dom.hosting_account?.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Certificate Authority
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                >
                  <option value="Let's Encrypt">Let's Encrypt CA (Automated & Free)</option>
                  <option value="ZeroSSL">ZeroSSL CA</option>
                  <option value="Sectigo">Sectigo Premium TLS</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="wildcard"
                  checked={isWildcard}
                  onChange={(e) => setIsWildcard(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="wildcard" className="text-sm font-semibold text-gray-700">
                  Provision Wildcard Certificate (*.domain.com)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsInstallOpen(false); setErrorMsg(""); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={installMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2 transition-all"
                >
                  {installMutation.isPending ? "Provisioning..." : "Deploy TLS Certificate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
