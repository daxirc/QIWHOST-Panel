"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  Save, Plus, Download, CheckCircle, XCircle, Calendar, Zap, Play,
  RotateCcw, Trash2, X, HardDrive
} from "lucide-react";

export default function CustomerBackups() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [backupType, setBackupType] = useState("full");
  const [errorMsg, setErrorMsg] = useState("");
  const [restoreModal, setRestoreModal] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [restoreType, setRestoreType] = useState("all");

  const { data: backupsRes, isLoading } = useQuery({
    queryKey: ["customer", "backups"],
    queryFn: async () => {
      const res = await API.get("/customer/backups");
      return res.data.data;
    }
  });

  const backups = Array.isArray(backupsRes) ? backupsRes : [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/backups", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "backups"] });
      setIsCreateOpen(false);
      setBackupType("full");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to create backup.");
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      const res = await API.post(`/customer/backups/${id}/restore`, { restore_type: type });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "backups"] });
      setRestoreModal(null);
      alert("Backup restored successfully!");
    },
    onError: (err: any) => alert(err.response?.data?.message || "Restore failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/customer/backups/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "backups"] });
      setDeleteModal(null);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Delete failed."),
  });

  const handleCreateBackup = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ backup_type: backupType });
  };

  const handleDownload = async (backup: any) => {
    const token = localStorage.getItem("token") || "";
    const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/customer/backups/${backup.id}/download?token=${token}`;
    window.open(url, "_blank");
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Save className="w-7 h-7 text-primary" />
            Backup Vault
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, download, restore, and manage your hosting backups.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Create Backup</span>
        </button>
      </div>

      {/* Backups Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Save className="w-12 h-12 mx-auto text-gray-200" />
            <p className="font-semibold text-gray-500">No backups yet</p>
            <p className="text-xs">Create your first backup to protect your website and databases.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Filename</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Storage</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {backups.map((bk: any) => (
                  <tr key={bk.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900">
                      {bk.file_name || bk.filename}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        bk.backup_type === "full" ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : bk.backup_type === "files" ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-green-50 text-green-700 border border-green-200"
                      }`}>
                        {bk.backup_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {formatSize(bk.size || bk.file_size)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(bk.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold ${bk.storage_type === 'remote' ? 'text-blue-600' : 'text-gray-500'}`}>
                        {bk.storage_type === 'remote' ? '☁ Remote' : '💾 Local'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {bk.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : bk.status === "pending" || bk.status === "queued" ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse">
                          <Zap className="w-3.5 h-3.5" /> {bk.status === "queued" ? "Queued" : "Running..."}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
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
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Save className="w-5 h-5 text-primary" />
                Create Backup
              </h2>
              <button onClick={() => { setIsCreateOpen(false); setErrorMsg(""); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBackup} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">{errorMsg}</div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Backup Type</label>
                <select
                  value={backupType}
                  onChange={(e) => setBackupType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="full">Full Backup (Files + Databases)</option>
                  <option value="files">Files Only (public_html)</option>
                  <option value="database">Databases Only</option>
                </select>
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => { setIsCreateOpen(false); setErrorMsg(""); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2">
                  <Play className="w-4 h-4 fill-white" />
                  {createMutation.isPending ? "Creating..." : "Create Backup"}
                </button>
              </div>
            </form>
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
                <strong>Warning:</strong> This will replace your current files and/or databases. A pre-restore backup of your current files will be created automatically.
              </div>
              <p className="text-sm text-gray-600"><strong>File:</strong> {restoreModal.file_name || restoreModal.filename}</p>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">What to Restore</label>
                <select value={restoreType} onChange={(e) => setRestoreType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="all">Everything (Files + Databases)</option>
                  <option value="files">Files Only</option>
                  <option value="database">Databases Only</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button onClick={() => setRestoreModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button
                  onClick={() => restoreMutation.mutate({ id: restoreModal.id, type: restoreType })}
                  disabled={restoreMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2 disabled:opacity-50">
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
                Permanently delete <strong>{deleteModal.file_name || deleteModal.filename}</strong>? This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button
                  onClick={() => deleteMutation.mutate(deleteModal.id)}
                  disabled={deleteMutation.isPending}
                  className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md disabled:opacity-50">
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
