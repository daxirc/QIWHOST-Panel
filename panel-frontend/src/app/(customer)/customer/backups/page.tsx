"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  Save, 
  Plus, 
  Download, 
  Search,
  Sparkles,
  CheckCircle,
  XCircle,
  HardDrive,
  Calendar,
  Zap,
  Play
} from "lucide-react";

export default function CustomerBackups() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [backupType, setBackupType] = useState("full");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch backup archives
  const { data: backupsRes, isLoading } = useQuery({
    queryKey: ["customer", "backups"],
    queryFn: async () => {
      const res = await API.get("/customer/backups");
      return res.data.data;
    }
  });

  const backups = Array.isArray(backupsRes) ? backupsRes : [];

  // Create Backup Mutation
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
      alert("Backup archive generated successfully.");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to trigger backup package execution.");
    }
  });

  const handleCreateBackup = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      backup_type: backupType
    });
  };

  const handleDownload = async (backup: any) => {
    try {
      // Direct redirect to download endpoint to let browser stream the file
      const token = localStorage.getItem("token") || "";
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/customer/backups/${backup.id}/download?token=${token}`;
      window.open(url, "_blank");
    } catch (err) {
      alert("Failed to download archive.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Save className="w-7 h-7 text-primary" />
            Hosting Backup Vault
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Package public folder assets, dump SQL structures to tarballs, and download complete historical restore points.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Generate Backup Archive</span>
        </button>
      </div>

      {/* Main Backups List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Loading archives catalog...</div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Save className="w-12 h-12 mx-auto text-gray-200" />
            <p className="font-semibold text-gray-500">No backup tarballs generated</p>
            <p className="text-xs">Compile a fresh backup to protect your websites and database clusters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Filename</th>
                  <th className="px-6 py-4">Archive Scope</th>
                  <th className="px-6 py-4">File Size</th>
                  <th className="px-6 py-4">Compilation Date</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {backups.map((bk: any) => (
                  <tr key={bk.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900">
                      {bk.filename}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        bk.backup_type === "full" 
                          ? "bg-purple-50 text-purple-700 border border-purple-200" 
                          : bk.backup_type === "files"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}>
                        {bk.backup_type} Backup
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {(bk.file_size / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(bk.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {bk.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Finished</span>
                        </span>
                      ) : bk.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Packaging...</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDownload(bk)}
                        disabled={bk.status !== "completed"}
                        className={`inline-flex items-center gap-1 bg-primary hover:bg-primary-hover text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow transition-colors ${
                          bk.status !== "completed" ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Backup Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Save className="w-5 h-5 text-primary" />
                Generate Backup Archive
              </h2>
              <button 
                onClick={() => { setIsCreateOpen(false); setErrorMsg(""); }}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateBackup} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Archive Scope Type
                </label>
                <select
                  value={backupType}
                  onChange={(e) => setBackupType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                >
                  <option value="full">Full Backup (Source Files + All Databases)</option>
                  <option value="files">Home Files only (public_html/ assets)</option>
                  <option value="database">MySQL Database clusters only</option>
                </select>
                <p className="text-[10px] text-gray-400 pt-1 leading-normal">
                  Large directory sizes might require a few moments to compile. You can refresh this page to view progress status.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); setErrorMsg(""); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2 transition-all animate-bounce"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {createMutation.isPending ? "Compiling..." : "Start Packaging"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
