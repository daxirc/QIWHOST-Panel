"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  FolderOpen, 
  FileText, 
  Plus, 
  Trash2, 
  Upload, 
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  HardDrive,
  Edit,
  Save,
  Loader2,
  FolderPlus,
  FilePlus,
  Terminal,
  ExternalLink
} from "lucide-react";

export default function CustomerFileManager() {
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState("public_html");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"file" | "directory">("file");
  const [newItemName, setNewItemName] = useState("");
  const [editingFile, setEditingFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch file list
  const { data: filesRes, isLoading } = useQuery({
    queryKey: ["customer", "files", currentPath],
    queryFn: async () => {
      const res = await API.get(`/customer/files?path=${encodeURIComponent(currentPath)}`);
      return res.data.data;
    }
  });

  const fileItems = filesRes?.items || [];
  const currentNormalizedPath = filesRes?.current_path || currentPath;

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/files/create", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      setIsCreateOpen(false);
      setNewItemName("");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to create item.");
    }
  });

  // Read file mutation/query trigger
  const readFileMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const res = await API.get(`/customer/files/read?path=${encodeURIComponent(filePath)}`);
      return res.data.data;
    },
    onSuccess: (data: any) => {
      setFileContent(data.content || "");
      setIsEditorOpen(true);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to read file.");
    }
  });

  // Save file mutation
  const saveFileMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/files/write", payload);
      return res.data;
    },
    onSuccess: () => {
      setIsEditorOpen(false);
      setEditingFile(null);
      setFileContent("");
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      alert("File saved successfully.");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to save file.");
    }
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const res = await API.delete(`/customer/files?path=${encodeURIComponent(filePath)}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to delete item.");
    }
  });

  // File Upload trigger
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", currentPath);

    try {
      await API.post("/customer/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      alert("File uploaded successfully.");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to upload file.");
    }
  };

  const handleNavigateUp = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/") || "public_html");
  };

  const handleItemClick = (item: any) => {
    if (item.type === "directory") {
      setCurrentPath(item.path);
    } else {
      setEditingFile(item);
      readFileMutation.mutate(item.path);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-primary" />
            Active File System Explorer
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse, upload, and update website source code repositories securely within your jailed system root.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors text-sm">
            <Upload className="w-4 h-4 text-gray-500" />
            <span>Upload File</span>
            <input type="file" onChange={handleUpload} className="hidden" />
          </label>
          <button
            onClick={() => { setCreateType("file"); setIsCreateOpen(true); }}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New File</span>
          </button>
          <button
            onClick={() => { setCreateType("directory"); setIsCreateOpen(true); }}
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all text-sm"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Folder</span>
          </button>
        </div>
      </div>

      {/* Path Breadcrumbs */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3 shadow-sm font-mono text-xs text-gray-600">
        <button
          onClick={handleNavigateUp}
          disabled={currentPath === "public_html" || !currentPath.includes("/")}
          className={`p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 ${
            currentPath === "public_html" || !currentPath.includes("/") ? "opacity-30 cursor-not-allowed" : ""
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
          <span className="font-bold text-gray-400">/home/username/</span>
          {currentPath.split("/").map((part, index, arr) => (
            <React.Fragment key={index}>
              <span 
                onClick={() => setCurrentPath(arr.slice(0, index + 1).join("/"))}
                className="hover:underline cursor-pointer font-bold text-primary"
              >
                {part}
              </span>
              {index < arr.length - 1 && <span className="text-gray-300">/</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main File Catalog Grid */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2 p-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span>Loading file catalog...</span>
          </div>
        ) : fileItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 p-12">
            <FolderOpen className="w-12 h-12 text-gray-200" />
            <p className="font-semibold text-gray-500">Folder is empty</p>
            <p className="text-xs">Upload files or create items using the toolbar options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">File Size</th>
                  <th className="px-6 py-4 text-center">Permissions</th>
                  <th className="px-6 py-4 text-center">Last Modified</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {fileItems.map((item: any) => (
                  <tr key={item.path} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <button
                        onClick={() => handleItemClick(item)}
                        className="flex items-center gap-3 hover:text-primary transition-colors text-left"
                      >
                        {item.type === "directory" ? (
                          <FolderOpen className="w-5 h-5 text-yellow-500 fill-yellow-100" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-500" />
                        )}
                        <span>{item.name}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {item.type === "directory" ? (
                        <span className="text-gray-300">—</span>
                      ) : item.size >= 1024 * 1024 ? (
                        `${(item.size / 1024 / 1024).toFixed(2)} MB`
                      ) : (
                        `${(item.size / 1024).toFixed(2)} KB`
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-gray-400">
                      {item.permissions}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-gray-400">
                      {new Date(item.modified * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.type === "file" && (
                          <button
                            onClick={() => { setEditingFile(item); readFileMutation.mutate(item.path); }}
                            className="text-gray-500 hover:text-primary p-2 hover:bg-gray-50 rounded-lg transition-all"
                            title="Edit File"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Warning: Deleting ${item.name} is permanent! Proceed?`)) {
                              deleteMutation.mutate(item.path);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all"
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

      {/* Item Creation Popup Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                {createType === "file" ? <FilePlus className="w-5 h-5 text-primary" /> : <FolderPlus className="w-5 h-5 text-gray-800" />}
                Create New {createType === "file" ? "File" : "Folder"}
              </h2>
              <button 
                onClick={() => { setIsCreateOpen(false); setErrorMsg(""); }}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  path: `${currentPath}/${newItemName}`,
                  type: createType
                });
              }} 
              className="p-6 space-y-4"
            >
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Name / Identifier
                </label>
                <input
                  type="text"
                  placeholder={createType === "file" ? "e.g. index.php" : "e.g. assets"}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                  required
                />
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
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Full-Screen Editor Dialog Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900 animate-in fade-in duration-200">
          <div className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between text-white select-none">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-bold text-sm tracking-wide">{editingFile?.name}</h3>
                <p className="text-[10px] text-gray-500 font-mono">Location: /home/username/{editingFile?.path}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  saveFileMutation.mutate({
                    path: editingFile.path,
                    content: fileContent
                  });
                }}
                disabled={saveFileMutation.isPending}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saveFileMutation.isPending ? "Saving..." : "Save Changes"}</span>
              </button>
              <button
                onClick={() => { setIsEditorOpen(false); setEditingFile(null); setFileContent(""); }}
                className="text-gray-400 hover:text-white px-3 py-2 text-xs font-bold transition-colors"
              >
                Close Editor
              </button>
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            {/* Simulation Line-Numbers */}
            <div className="bg-gray-950/70 text-gray-700 font-mono text-xs px-4 py-6 text-right select-none border-r border-gray-800/40">
              {Array(fileContent.split("\n").length).fill(0).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {/* Main Textarea code input */}
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="flex-1 bg-gray-950 text-gray-200 font-mono text-xs p-6 focus:outline-none resize-none overflow-y-auto leading-relaxed tab-size-4"
              spellCheck="false"
            />
          </div>
        </div>
      )}
    </div>
  );
}
