"use client";

import React, { useState, useEffect } from "react";
import { AdminAPI as API } from "@/lib/api";
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
  ExternalLink,
  ChevronDown,
  Globe,
  User
} from "lucide-react";

interface HostingAccount {
  id: number;
  domain: string;
  system_username: string;
  customer?: {
    name: string;
  };
}

export default function AdminFileManager() {
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [currentPath, setCurrentPath] = useState("public_html");
  const [fileItems, setFileItems] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"file" | "directory">("file");
  const [newItemName, setNewItemName] = useState("");
  const [editingFile, setEditingFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load hosting accounts for the dropdown
  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await API.get("/admin/hosting-accounts");
      if (res.data.success) {
        // If paginated, items are inside data.data or data
        const list = res.data.data.data || res.data.data || [];
        setAccounts(list);
        if (list.length > 0) {
          setSelectedAccountId(list[0].id.toString());
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load hosting accounts.");
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Fetch files for selected account and path
  const fetchFiles = async () => {
    if (!selectedAccountId) return;
    setLoadingFiles(true);
    setErrorMsg("");
    try {
      const res = await API.get(`/admin/files`, {
        params: { path: currentPath },
        headers: { "X-Hosting-Account-Id": selectedAccountId }
      });
      if (res.data.success) {
        setFileItems(res.data.data.items || []);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to load directory items.");
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    setCurrentPath("public_html");
  }, [selectedAccountId]);

  useEffect(() => {
    fetchFiles();
  }, [selectedAccountId, currentPath]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const res = await API.post(
        "/admin/files/create",
        { path: `${currentPath}/${newItemName}`, type: createType },
        { headers: { "X-Hosting-Account-Id": selectedAccountId } }
      );
      if (res.data.success) {
        setNewItemName("");
        setIsCreateOpen(false);
        fetchFiles();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to create item.");
    }
  };

  const handleReadFile = async (item: any) => {
    setEditingFile(item);
    setErrorMsg("");
    try {
      const res = await API.get(`/admin/files/read`, {
        params: { path: item.path },
        headers: { "X-Hosting-Account-Id": selectedAccountId }
      });
      if (res.data.success) {
        setFileContent(res.data.data.content || "");
        setIsEditorOpen(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to read file contents.");
    }
  };

  const handleSaveFile = async () => {
    try {
      const res = await API.post(
        "/admin/files/write",
        { path: editingFile.path, content: fileContent },
        { headers: { "X-Hosting-Account-Id": selectedAccountId } }
      );
      if (res.data.success) {
        setIsEditorOpen(false);
        setEditingFile(null);
        setFileContent("");
        fetchFiles();
        alert("File saved successfully.");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save file.");
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!confirm(`Warning: Deleting ${item.name} is permanent! Proceed?`)) return;
    try {
      const res = await API.delete(`/admin/files`, {
        params: { path: item.path },
        headers: { "X-Hosting-Account-Id": selectedAccountId }
      });
      if (res.data.success) {
        fetchFiles();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete item.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", currentPath);

    try {
      await API.post("/admin/files/upload", formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "X-Hosting-Account-Id": selectedAccountId
        }
      });
      fetchFiles();
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
      handleReadFile(item);
    }
  };

  const activeAccount = accounts.find(a => a.id.toString() === selectedAccountId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-primary" />
            Jailed Multi-Tenant File Explorer
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse and modify customer website source code securely inside jailed system containers.
          </p>
        </div>
        
        {/* Dropdown Selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm min-w-[280px]">
          <HardDrive className="w-4 h-4 text-primary" />
          <div className="flex-grow">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Account Container</label>
            {loadingAccounts ? (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading...
              </span>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full text-xs font-bold text-gray-800 focus:outline-none bg-transparent cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.domain} ({acc.system_username})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {selectedAccountId && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 font-mono text-xs text-gray-600 overflow-x-auto whitespace-nowrap py-1">
            <span className="font-bold text-gray-400">/home/{activeAccount?.system_username || "username"}/</span>
            <div className="flex items-center gap-1">
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

          <div className="flex items-center gap-3">
            <button
              onClick={handleNavigateUp}
              disabled={currentPath === "public_html" || !currentPath.includes("/")}
              className={`p-2 rounded-lg border border-gray-200 hover:bg-gray-50 bg-white ${
                currentPath === "public_html" || !currentPath.includes("/") ? "opacity-30 cursor-not-allowed" : ""
              }`}
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs">
              <Upload className="w-3.5 h-3.5 text-gray-500" />
              <span>Upload File</span>
              <input type="file" onChange={handleUpload} className="hidden" />
            </label>
            <button
              onClick={() => { setCreateType("file"); setIsCreateOpen(true); }}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New File</span>
            </button>
            <button
              onClick={() => { setCreateType("directory"); setIsCreateOpen(true); }}
              className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all text-xs"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>
          </div>
        </div>
      )}

      {/* Catalog */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between">
        {loadingFiles ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2 p-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span>Syncing filesystem directory tree...</span>
          </div>
        ) : fileItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 p-12 text-center">
            <FolderOpen className="w-12 h-12 text-gray-200 mb-2" />
            <p className="font-bold text-gray-500">Folder is empty</p>
            <p className="text-xs">No files exist in this folder. Start by uploading code or creating a script.</p>
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
              <tbody className="divide-y divide-gray-200 text-sm font-semibold text-gray-700">
                {fileItems.map((item: any) => (
                  <tr key={item.path} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleItemClick(item)}
                        className="flex items-center gap-3 hover:text-primary transition-colors text-left"
                      >
                        {item.type === "directory" ? (
                          <FolderOpen className="w-5 h-5 text-yellow-500 fill-yellow-100" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-500" />
                        )}
                        <span className="text-gray-850">{item.name}</span>
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
                    <td className="px-6 py-4 text-center text-xs text-gray-450">
                      {new Date(item.modified * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.type === "file" && (
                          <button
                            onClick={() => handleReadFile(item)}
                            className="text-gray-500 hover:text-primary p-2 hover:bg-gray-50 rounded-lg transition-all"
                            title="Edit File"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item)}
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

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-150 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-150 flex items-center justify-between bg-gray-50">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                {createType === "file" ? <FilePlus className="w-5 h-5 text-primary" /> : <FolderPlus className="w-5 h-5 text-gray-800" />}
                Create New {createType === "file" ? "File" : "Folder"}
              </h2>
              <button 
                onClick={() => { setIsCreateOpen(false); setErrorMsg(""); }}
                className="text-gray-400 hover:text-gray-700 font-bold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateItem} className="p-6 space-y-4 text-sm">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
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
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); setErrorMsg(""); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900 animate-in fade-in duration-200">
          <div className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between text-white select-none">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-bold text-sm tracking-wide">{editingFile?.name}</h3>
                <p className="text-[10px] text-gray-500 font-mono">Location: /home/{activeAccount?.system_username}/{editingFile?.path}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveFile}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
              <button
                onClick={() => { setIsEditorOpen(false); setEditingFile(null); setFileContent(""); }}
                className="text-gray-400 hover:text-white px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
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
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="flex-1 bg-gray-950 text-gray-200 font-mono text-xs p-6 focus:outline-none resize-none overflow-y-auto leading-relaxed tab-size-4 select-text"
              spellCheck="false"
            />
          </div>
        </div>
      )}
    </div>
  );
}
