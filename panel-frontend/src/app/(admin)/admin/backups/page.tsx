"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminAPI as API } from "@/lib/api";
import {
  HardDrive, Server, RefreshCw, Trash2, Download, ShieldCheck, Loader2,
  AlertCircle, FileArchive, Plus, RotateCcw, Play, Settings, Wifi,
  WifiOff, Database, FolderArchive, Calendar, CheckCircle, XCircle,
  Zap, ChevronDown, X
} from "lucide-react";

interface Backup {
  id: number;
  file_name: string;
  file_path: string;
  backup_type: string;
  size: number;
  status: string;
  storage_type: string;
  backup_log: string | null;
  created_at: string;
  completed_at: string | null;
  hosting_account?: {
    id: number;
    domain: string;
    system_username: string;
  };
}

interface HostingAccount {
  id: number;
  domain: string;
  system_username: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function AdminBackups() {
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [restoreModal, setRestoreModal] = useState<Backup | null>(null);
  const [deleteModal, setDeleteModal] = useState<Backup | null>(null);
  const [logModal, setLogModal] = useState<Backup | null>(null);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [backupType, setBackupType] = useState("full");
  const [restoreType, setRestoreType] = useState("all");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Fetch backups
  const { data: backupsRes, isLoading } = useQuery({
    queryKey: ["admin", "backups", filterType, filterStatus],
    queryFn: async () => {
      let url = "/admin/backups?";
      if (filterType) url += `backup_type=${filterType}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      const res = await API.get(url);
      return res.data.data;
    },
  });

  const backups: Backup[] = backupsRes?.data || [];

  // Fetch stats
  const { data: statsRes } = useQuery({
    queryKey: ["admin", "backups", "stats"],
    queryFn: async () => {
      const res = await API.get("/admin/backups/stats");
      return res.data.data;
    },
  });

  // Fetch accounts for create modal
  const { data: accountsRes } = useQuery({
    queryKey: ["admin", "accounts-for-backup"],
    queryFn: async () => {
      const res = await API.get("/admin/hosting-accounts");
      return res.data.data;
    },
  });

  const accounts: HostingAccount[] = Array.isArray(accountsRes) ? accountsRes : accountsRes?.data || [];

  // Create backup
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/admin/backups", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] });
      setCreateModal(false);
      setSelectedAccount("");
    },
    onError: (err: any) => alert(err.response?.data?.message || "Backup creation failed."),
  });

  // Delete backup
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/admin/backups/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] });
      setDeleteModal(null);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Delete failed."),
  });

  // Restore backup
  const restoreMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      const res = await API.post(`/admin/backups/${id}/restore`, { restore_type: type });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] });
      setRestoreModal(null);
      alert("Restore completed successfully!");
    },
    onError: (err: any) => alert(err.response?.data?.message || "Restore failed."),
  });

  // Run all backups
  const runAllMutation = useMutation({
    mutationFn: async () => {
      const res = await API.post("/admin/backups/run-all");
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] });
      alert(data.message || "All backup jobs queued.");
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to run backups."),
  });

  const handleDownload = (backup: Backup) => {
    const token = localStorage.getItem("admin_token") || "";
    const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/admin/backups/${backup.id}/download?token=${token}`;
    window.open(url, "_blank");
  };

  const remote = statsRes?.remote || {};
  const dbStats = statsRes?.database || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <HardDrive className="w-7 h-7 text-primary" />
            Backup Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage backups across all hosting accounts with remote storage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => runAllMutation.mutate()}
            disabled={runAllMutation.isPending}
            className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
          >
            <Play className="w-4 h-4" />
            {runAllMutation.isPending ? "Queuing..." : "Backup All Accounts"}
          </button>
          <button
            onClick={() => setCreateModal(true)}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Backup
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Backups</p>
          <h3 className="text-2xl font-extrabold text-gray-800">{dbStats.total_backups || 0}</h3>
          <p className="text-xs text-gray-400">
            <span className="text-green-600 font-semibold">{dbStats.completed_backups || 0}</span> completed,{" "}
            <span className="text-red-500 font-semibold">{dbStats.failed_backups || 0}</span> failed
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Backup Size</p>
          <h3 className="text-2xl font-extrabold text-gray-800">{formatBytes(dbStats.total_size || 0)}</h3>
          <p className="text-xs text-gray-400">Across all accounts</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Remote Server</p>
          {remote.connected ? (
            <>
              <div className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
                <Wifi className="w-4 h-4" />
                <span>Connected</span>
              </div>
              <p className="text-xs text-gray-400">{remote.host}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-red-500 font-bold text-sm">
                <WifiOff className="w-4 h-4" />
                <span>Not Connected</span>
              </div>
              <p className="text-xs text-gray-400">{remote.message || "Configure in Settings"}</p>
            </>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Remote Storage</p>
          {remote.connected ? (
            <>
              <h3 className="text-2xl font-extrabold text-gray-800">{formatBytes(remote.free_bytes || 0)}</h3>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${remote.total_bytes ? ((remote.used_bytes / remote.total_bytes) * 100).toFixed(1) : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {formatBytes(remote.used_bytes || 0)} / {formatBytes(remote.total_bytes || 0)} used
              </p>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-extrabold text-gray-300">—</h3>
              <p className="text-xs text-gray-400">Not available</p>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Types</option>
          <option value="full">Full</option>
          <option value="files">Files</option>
          <option value="database">Database</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "backups"] })}
          className="border border-gray-200 hover:bg-gray-50 text-gray-500 p-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Backups Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-gray-500">Loading backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <FileArchive className="w-12 h-12 mx-auto text-gray-200" />
            <p className="font-semibold">No backups found</p>
            <p className="text-xs text-gray-400">Create your first backup to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-4">Filename</th>
                  <th className="px-5 py-4">Account</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Size</th>
                  <th className="px-5 py-4">Storage</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {backups.map((bk) => (
                  <tr key={bk.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FileArchive className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="font-mono text-xs text-gray-800 font-semibold truncate max-w-[200px]">{bk.file_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-gray-800 font-semibold text-xs">{bk.hosting_account?.domain || "—"}</p>
                        <p className="text-[10px] text-gray-400">{bk.hosting_account?.system_username}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        bk.backup_type === "full" ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : bk.backup_type === "files" ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-green-50 text-green-700 border border-green-200"
                      }`}>
                        {bk.backup_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{formatBytes(bk.size)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold ${bk.storage_type === 'remote' ? 'text-blue-600' : 'text-gray-500'}`}>
                        {bk.storage_type === 'remote' ? '☁ Remote' : '💾 Local'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(bk.created_at).toLocaleDateString()}
                      <br />
                      <span className="text-gray-400">{new Date(bk.created_at).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-5 py-3">
                      {bk.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" /> Completed
                        </span>
                      ) : bk.status === "pending" || bk.status === "queued" ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold animate-pulse">
                          <Zap className="w-3 h-3" /> {bk.status === "queued" ? "Queued" : "Running"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDownload(bk)}
                          disabled={bk.status !== "completed"}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRestoreModal(bk)}
                          disabled={bk.status !== "completed"}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setLogModal(bk)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                          title="View Log"
                        >
                          <FileArchive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal(bk)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Backup Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Create Backup
              </h2>
              <button onClick={() => setCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hosting Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Select account...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.domain} ({acc.system_username})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Backup Type</label>
                <select
                  value={backupType}
                  onChange={(e) => setBackupType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="full">Full (Files + Databases)</option>
                  <option value="files">Files Only</option>
                  <option value="database">Database Only</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedAccount) return alert("Select an account.");
                    createMutation.mutate({ hosting_account_id: selectedAccount, backup_type: backupType });
                  }}
                  disabled={createMutation.isPending || !selectedAccount}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {createMutation.isPending ? "Creating..." : "Create Backup"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {restoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-500" />
                Restore Backup
              </h2>
              <button onClick={() => setRestoreModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg">
                <strong>Warning:</strong> Restoring will replace current files/databases. A pre-restore backup of current files will be created automatically.
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600"><strong>Backup:</strong> {restoreModal.file_name}</p>
                <p className="text-sm text-gray-600"><strong>Account:</strong> {restoreModal.hosting_account?.domain}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Restore Scope</label>
                <select
                  value={restoreType}
                  onChange={(e) => setRestoreType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">Everything (Files + Databases)</option>
                  <option value="files">Files Only</option>
                  <option value="database">Databases Only</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button onClick={() => setRestoreModal(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button
                  onClick={() => restoreMutation.mutate({ id: restoreModal.id, type: restoreType })}
                  disabled={restoreMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {restoreMutation.isPending ? "Restoring..." : "Restore Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Delete Backup
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Permanently delete <strong className="text-gray-800">{deleteModal.file_name}</strong> from {deleteModal.storage_type === 'remote' ? 'remote server' : 'local storage'}?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteModal(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button
                  onClick={() => deleteMutation.mutate(deleteModal.id)}
                  disabled={deleteMutation.isPending}
                  className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Modal */}
      {logModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">Backup Log</h2>
              <button onClick={() => setLogModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap font-mono border border-gray-200">
                {logModal.backup_log || "No log available."}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
