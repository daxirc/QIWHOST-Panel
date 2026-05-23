"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  Database as DbIcon, 
  Plus, 
  Trash2, 
  ExternalLink,
  Search,
  User,
  KeyRound,
  Network,
  Lock,
  Check,
  Loader2,
  Server
} from "lucide-react";

export default function CustomerDatabases() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"databases" | "remote-mysql">("databases");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Database Creation Modal State
  const [isAddDbOpen, setIsAddDbOpen] = useState(false);
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  
  // User Password Change State
  const [selectedUserForPass, setSelectedUserForPass] = useState<any>(null);
  const [newUserPassword, setNewUserPassword] = useState("");
  
  // Remote MySQL State
  const [remoteIp, setRemoteIp] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch client databases
  const { data: databasesRes, isLoading: isDbsLoading } = useQuery({
    queryKey: ["customer", "databases"],
    queryFn: async () => {
      const res = await API.get("/customer/databases");
      return res.data.data;
    }
  });

  const databases = Array.isArray(databasesRes) ? databasesRes : [];

  // Create Database & User Mutation
  const createDbMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/databases", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "databases"] });
      setIsAddDbOpen(false);
      setDbName("");
      setDbUser("");
      setDbPassword("");
      showStatus("success", "MySQL Database and User provisioned successfully!");
    },
    onError: (err: any) => {
      showStatus("error", err.response?.data?.message || "Failed to provision database.");
    }
  });

  // Delete Database Mutation
  const deleteDbMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/customer/databases/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "databases"] });
      showStatus("success", "Database schema dropped successfully.");
    },
    onError: (err: any) => {
      showStatus("error", err.response?.data?.message || "Failed to drop database.");
    }
  });

  // phpMyAdmin SSO Mutation (Fixed route endpoint to phpmyadmin-sso)
  const ssoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/customer/databases/${id}/phpmyadmin-sso`);
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data?.sso_url) {
        window.open(data.sso_url, "_blank");
      }
    },
    onError: (err: any) => {
      showStatus("error", err.response?.data?.message || "phpMyAdmin SSO failed.");
    }
  });

  // Change User Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await API.put(`/customer/database-users/${userId}/password`, { password });
      return res.data;
    },
    onSuccess: () => {
      setSelectedUserForPass(null);
      setNewUserPassword("");
      showStatus("success", "Database user password updated successfully!");
    },
    onError: (err: any) => {
      showStatus("error", err.response?.data?.message || "Failed to update database user password.");
    }
  });

  // Remote MySQL IP Authorization Mutation
  const remoteAccessMutation = useMutation({
    mutationFn: async (ip: string) => {
      const res = await API.post("/customer/databases/remote-access", { allowed_ip: ip });
      return res.data;
    },
    onSuccess: () => {
      setRemoteIp("");
      showStatus("success", `Remote MySQL authorization successfully granted for IP: ${remoteIp || "specified host"}`);
    },
    onError: (err: any) => {
      showStatus("error", err.response?.data?.message || "Failed to authorize remote host.");
    }
  });

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleCreateDatabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbName || !dbUser || !dbPassword) {
      showStatus("error", "Please fill in all database provisioning fields.");
      return;
    }
    createDbMutation.mutate({
      database_name: dbName,
      database_username: dbUser,
      database_password: dbPassword
    });
  };

  const filteredDatabases = databases.filter((db: any) => 
    db.database_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    db.database_name_prefix.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <DbIcon className="w-7 h-7 text-primary" />
            MySQL Databases & Users Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Deploy SQL schemas, delegate read/write user roles, configure remote connection hosts, and launch phpMyAdmin single-sign-on.
          </p>
        </div>
        <button
          onClick={() => setIsAddDbOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Provision Database</span>
        </button>
      </div>

      {/* Status Messages */}
      {statusMsg && (
        <div className={`p-4 rounded-lg border text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
          statusMsg.type === "success" 
            ? "bg-green-50 border-green-200 text-green-700" 
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {statusMsg.type === "success" ? <Check className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-red-500" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab("databases")}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === "databases"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <DbIcon className="w-4 h-4" />
          <span>Databases & Users</span>
        </button>
        <button
          onClick={() => setActiveTab("remote-mysql")}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 flex items-center gap-2 ${
            activeTab === "remote-mysql"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Remote MySQL Access</span>
        </button>
      </div>

      {activeTab === "databases" ? (
        <div className="space-y-6">
          {/* Stats & Search */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-primary rounded-full">
                <DbIcon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Databases</h4>
                <h3 className="text-3xl font-extrabold text-gray-800">{isDbsLoading ? "..." : databases.length}</h3>
              </div>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search database schemas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-55 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-850"
              />
            </div>
          </div>

          {/* Databases Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {isDbsLoading ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-medium">Querying database configurations...</p>
              </div>
            ) : filteredDatabases.length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <DbIcon className="w-12 h-12 mx-auto text-gray-200 animate-pulse" />
                <p className="font-bold text-gray-600 text-base">No database schemas created</p>
                <p className="text-xs max-w-sm mx-auto">Deploy a MySQL database and user credentials to enable persistent storage for applications.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Database Name</th>
                      <th className="px-6 py-4">Database User</th>
                      <th className="px-6 py-4">Host</th>
                      <th className="px-6 py-4">Size</th>
                      <th className="px-6 py-4 text-center">phpMyAdmin</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                    {filteredDatabases.map((db: any) => (
                      <tr key={db.id} className="hover:bg-gray-50/50 transition-colors font-semibold">
                        <td className="px-6 py-4 font-mono font-bold text-gray-900">
                          {db.database_name_prefix}_{db.database_name}
                        </td>
                        <td className="px-6 py-4 text-gray-600 flex flex-col gap-1">
                          <span className="font-mono text-gray-800">{db.database_name_prefix}_user</span>
                          <button
                            onClick={() => setSelectedUserForPass({ id: db.id, username: `${db.database_name_prefix}_user` })}
                            className="text-xs text-primary hover:underline text-left flex items-center gap-1 font-medium"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Change Password</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-500">
                          {db.connection_host}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {db.size_mb !== undefined ? `${db.size_mb} MB` : "0.5 MB"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => ssoMutation.mutate(db.id)}
                            disabled={ssoMutation.isPending}
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:text-blue-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{ssoMutation.isPending && ssoMutation.variables === db.id ? "Connecting..." : "Open phpMyAdmin"}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`Warning: Deleting this database will permanently erase all data inside ${db.database_name_prefix}_${db.database_name}. Proceed?`)) {
                                deleteDbMutation.mutate(db.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-750 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Delete Database"
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
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add IP Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 lg:col-span-1 h-fit">
            <div className="flex items-center gap-2.5 text-primary">
              <Network className="w-5 h-5" />
              <h3 className="font-bold text-gray-800">Authorize Connection</h3>
            </div>
            <p className="text-xs text-gray-550 leading-relaxed">
              Add your desktop IP address or deployment servers to the remote access hosts list to allow external database connections over port <span className="font-mono text-xs font-bold text-primary">3306</span>.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!remoteIp) return;
                remoteAccessMutation.mutate(remoteIp);
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  IP Address / Wildcard (%)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.100 or %"
                  value={remoteIp}
                  onChange={(e) => setRemoteIp(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={remoteAccessMutation.isPending}
                className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-bold py-2.5 rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                {remoteAccessMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authorizing IP...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Authorize Remote IP</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Guidelines info card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2.5 text-orange-500">
              <Server className="w-5 h-5" />
              <h3 className="font-bold text-gray-800">Connection Details</h3>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <p>When connecting remotely, utilize the following parameters:</p>
              <div className="bg-gray-50 border border-gray-250 rounded-lg p-4 font-mono text-xs text-gray-700 space-y-2">
                <div><span className="text-gray-400">Database Host:</span> node1.qiwhost.com (or your server node IP)</div>
                <div><span className="text-gray-400">Database Port:</span> 3306</div>
                <div><span className="text-gray-400">Username:</span> {"{prefix}_{username}"}</div>
                <div><span className="text-gray-400">Password:</span> Your database user password</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-150 rounded-lg text-xs text-blue-800 flex gap-2">
                <span className="font-bold">Pro Tip:</span> Enter <span className="font-mono bg-blue-100 px-1 py-0.5 rounded font-bold">%</span> in the IP address field to allow remote MySQL connections from any host (not recommended for production).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {selectedUserForPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Update Database Password
              </h2>
              <button 
                onClick={() => setSelectedUserForPass(null)}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newUserPassword) return;
                changePasswordMutation.mutate({ userId: selectedUserForPass.id, password: newUserPassword });
              }} 
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase block">
                  Database User
                </label>
                <div className="font-mono text-sm text-gray-850 font-bold bg-gray-50 border border-gray-150 px-3 py-2 rounded-lg">
                  {selectedUserForPass.username}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter complex password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-gray-55 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPass(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-55 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2 transition-all"
                >
                  {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision Database Modal */}
      {isAddDbOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <DbIcon className="w-5 h-5 text-primary" />
                Deploy SQL Database
              </h2>
              <button 
                onClick={() => setIsAddDbOpen(false)}
                className="text-gray-400 hover:text-gray-650 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateDatabase} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Database Name (Suffix)
                </label>
                <div className="flex items-center">
                  <span className="bg-gray-100 border border-r-0 border-gray-200 text-gray-500 px-3 py-2.5 text-sm rounded-l-lg font-mono font-bold">
                    db_
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. wordpress"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-r-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Database Username (Suffix)
                </label>
                <div className="flex items-center">
                  <span className="bg-gray-100 border border-r-0 border-gray-200 text-gray-500 px-3 py-2.5 text-sm rounded-l-lg font-mono font-bold">
                    user_
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. wpuser"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-r-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                  Database Password
                </label>
                <input
                  type="password"
                  placeholder="Enter complex password"
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-medium"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddDbOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDbMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2 transition-all"
                >
                  {createDbMutation.isPending ? "Deploying..." : "Provision Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
