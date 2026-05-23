"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import { 
  Mail, 
  Plus, 
  Trash2, 
  Search,
  Sparkles,
  User,
  KeyRound,
  ShieldCheck,
  CheckCircle,
  XCircle,
  HardDrive
} from "lucide-react";

export default function AdminEmails() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Form State
  const [hostingAccountId, setHostingAccountId] = useState("");
  const [localPart, setLocalPart] = useState("");
  const [password, setPassword] = useState("");
  const [quota, setQuota] = useState("1024");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch emails
  const { data: emailsRes, isLoading } = useQuery({
    queryKey: ["admin", "emails"],
    queryFn: async () => {
      const res = await API.get("/admin/emails");
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

  const emails = Array.isArray(emailsRes) ? emailsRes : [];
  const accounts = Array.isArray(accountsRes) ? accountsRes : [];

  // Create Email Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/admin/emails", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "emails"] });
      setIsAddOpen(false);
      setLocalPart("");
      setPassword("");
      setQuota("1024");
      setName("");
      setHostingAccountId("");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to create email mailbox.");
    }
  });

  // Delete Email Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/admin/emails/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "emails"] });
    }
  });

  const handleCreateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostingAccountId || !localPart || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    createMutation.mutate({
      hosting_account_id: hostingAccountId,
      local_part: localPart,
      password: password,
      quota: parseInt(quota),
      name: name
    });
  };

  const filteredEmails = emails.filter((email: any) => 
    email.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.hosting_account?.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Mail className="w-7 h-7 text-primary" />
            Global Mail Routing Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Provision email mailboxes, configure storage quotas, and manage IMAP/SMTP services for subscribers.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Provision Mailbox</span>
        </button>
      </div>

      {/* Stats Counter & Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-primary rounded-full">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Mailboxes</h4>
            <h3 className="text-3xl font-extrabold text-gray-800">{isLoading ? "..." : emails.length}</h3>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search email accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-800"
          />
        </div>
      </div>

      {/* Emails Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Loading email accounts...</div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Mail className="w-12 h-12 mx-auto text-gray-200" />
            <p className="font-semibold text-gray-500">No mailboxes created</p>
            <p className="text-xs">Create a mailbox to enable sending and receiving of emails.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Email Username</th>
                  <th className="px-6 py-4">Display Name</th>
                  <th className="px-6 py-4">Hosting Account Link</th>
                  <th className="px-6 py-4">Quota (MB)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {filteredEmails.map((email: any) => (
                  <tr key={email.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {email.username}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {email.name || <span className="text-gray-400 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-800">
                      {email.hosting_account?.domain || "System Account"}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4 text-gray-400" />
                        <span>{email.quota} MB</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {email.active ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Suspended</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to permanently delete the email address ${email.username}?`)) {
                            deleteMutation.mutate(email.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Delete Email"
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

      {/* Provision Mailbox Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Provision Mailbox
              </h2>
              <button 
                onClick={() => { setIsAddOpen(false); setErrorMsg(""); }}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateEmail} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Hosting Account
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
                  Email Address Prefix
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. info"
                    value={localPart}
                    onChange={(e) => setLocalPart(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-l-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                    required
                  />
                  <span className="bg-gray-100 border border-l-0 border-gray-200 text-gray-500 px-3 py-2.5 text-sm rounded-r-lg font-mono">
                    @{hostingAccountId ? (accounts.find(a => a.id === parseInt(hostingAccountId))?.domain || "domain.com") : "domain.com"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Support Desk"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                  Mailbox Quota (MB)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1024"
                  value={quota}
                  onChange={(e) => setQuota(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Mailbox Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  {createMutation.isPending ? "Creating..." : "Provision Mailbox"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
