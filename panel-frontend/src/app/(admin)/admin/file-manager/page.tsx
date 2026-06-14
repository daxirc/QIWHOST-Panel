"use client";

import React, { useState, useEffect, useRef } from "react";
import { AdminAPI as API } from "@/lib/api";
import { 
  Folder, 
  File, 
  Trash2, 
  Upload, 
  Download, 
  Edit, 
  Save, 
  Loader2, 
  FolderPlus, 
  FileCode, 
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Search,
  MoreVertical,
  FolderOpen,
  Scissors,
  Copy as CopyIcon,
  Archive,
  FolderSync,
  Lock,
  DownloadCloud,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Globe,
  Terminal,
  HardDrive,
  User
} from "lucide-react";

interface HostingAccount {
  id: number;
  domain: string;
  system_username: string;
  customer?: { name: string; };
}

interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
  permissions: string;
  is_writable?: boolean;
  extension?: string;
}

export default function AdminFileManager() {
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [currentPath, setCurrentPath] = useState("public_html");
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"file" | "directory">("file");
  const [newItemName, setNewItemName] = useState("");

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");

  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [copyDest, setCopyDest] = useState("");

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveDest, setMoveDest] = useState("");

  const [isCompressOpen, setIsCompressOpen] = useState(false);
  const [zipName, setZipName] = useState("archive.zip");

  const [isExtractOpen, setIsExtractOpen] = useState(false);
  const [extractDest, setExtractDest] = useState("");

  const [isPermsOpen, setIsPermsOpen] = useState(false);
  const [permOwner, setPermOwner] = useState({ read: false, write: false, execute: false });
  const [permGroup, setPermGroup] = useState({ read: false, write: false, execute: false });
  const [permOther, setPermOther] = useState({ read: false, write: false, execute: false });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState("");

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<{ file: File; progress: number; status: "pending" | "uploading" | "success" | "error"; error?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const hdrs = () => ({ "X-Hosting-Account-Id": selectedAccountId });

  // Load hosting accounts
  useEffect(() => {
    (async () => {
      setLoadingAccounts(true);
      try {
        const res = await API.get("/admin/hosting-accounts");
        if (res.data.success) {
          const list = res.data.data.data || res.data.data || [];
          setAccounts(list);
          if (list.length > 0) setSelectedAccountId(list[0].id.toString());
        }
      } catch { setErrorMsg("Failed to load hosting accounts."); }
      finally { setLoadingAccounts(false); }
    })();
  }, []);

  // Fetch files
  const fetchFiles = async () => {
    if (!selectedAccountId) return;
    setLoadingFiles(true);
    setErrorMsg("");
    try {
      const res = await API.get("/admin/files", { params: { path: currentPath }, headers: hdrs() });
      if (res.data.success) setFileItems(res.data.data.items || []);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to load directory.");
    } finally { setLoadingFiles(false); }
  };

  useEffect(() => { setCurrentPath("public_html"); setSelectedPaths([]); }, [selectedAccountId]);
  useEffect(() => { fetchFiles(); setSelectedPaths([]); }, [selectedAccountId, currentPath]);

  useEffect(() => {
    const h = () => setContextMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  // Helpers
  const activeAccount = accounts.find(a => a.id.toString() === selectedAccountId);
  const getSelectedSingleItem = () => selectedPaths.length === 1 ? fileItems.find(i => i.path === selectedPaths[0]) || null : null;
  const getExt = (name: string) => { const idx = name.lastIndexOf("."); return idx > 0 ? name.substring(idx + 1).toLowerCase() : ""; };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024; const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIconInfo = (item: FileItem) => {
    if (item.type === "directory") return { component: <Folder className="w-5 h-5 text-blue-500 fill-blue-100" /> };
    const ext = item.extension || getExt(item.name);
    if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return { component: <ImageIcon className="w-5 h-5 text-green-500" /> };
    if (ext === "php") return { component: <FileCode className="w-5 h-5 text-purple-500" /> };
    if (["html","css"].includes(ext)) return { component: <Globe className="w-5 h-5 text-orange-500" /> };
    if (["js","ts","jsx","tsx","json"].includes(ext)) return { component: <Terminal className="w-5 h-5 text-yellow-500" /> };
    if (["zip","tar","gz","rar"].includes(ext)) return { component: <FileArchive className="w-5 h-5 text-gray-500" /> };
    if (ext === "sql") return { component: <FileSpreadsheet className="w-5 h-5 text-indigo-500" /> };
    return { component: <File className="w-5 h-5 text-gray-400" /> };
  };

  const calcOctal = (o: any, g: any, ot: any) => `${(o.read?4:0)+(o.write?2:0)+(o.execute?1:0)}${(g.read?4:0)+(g.write?2:0)+(g.execute?1:0)}${(ot.read?4:0)+(ot.write?2:0)+(ot.execute?1:0)}`;

  const loadPerms = (s: string) => {
    const c = s.length === 4 ? s.substring(1) : s;
    const o = parseInt(c[0]) || 0, g = parseInt(c[1]) || 0, t = parseInt(c[2]) || 0;
    setPermOwner({ read: (o&4)!==0, write: (o&2)!==0, execute: (o&1)!==0 });
    setPermGroup({ read: (g&4)!==0, write: (g&2)!==0, execute: (g&1)!==0 });
    setPermOther({ read: (t&4)!==0, write: (t&2)!==0, execute: (t&1)!==0 });
  };

  // Navigation
  const handleNavigate = (path: string) => setCurrentPath(path);
  const handleNavigateUp = () => {
    const parts = currentPath.split("/"); parts.pop();
    setCurrentPath(parts.join("/") || "public_html");
  };

  const handleItemClick = (item: FileItem, e: React.MouseEvent) => {
    if (e.ctrlKey) {
      setSelectedPaths(prev => prev.includes(item.path) ? prev.filter(p => p !== item.path) : [...prev, item.path]);
    } else { setSelectedPaths([item.path]); }
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.type === "directory") handleNavigate(item.path);
    else handleReadFile(item);
  };

  // API Actions
  const handleReadFile = async (item: FileItem) => {
    setEditingFile(item);
    try {
      const res = await API.get("/admin/files/read", { params: { path: item.path }, headers: hdrs() });
      if (res.data.success) { setFileContent(res.data.data.content || ""); setIsEditorOpen(true); }
    } catch (err: any) { alert(err.response?.data?.message || "Failed to read file."); }
  };

  const handleSaveFile = async () => {
    setActionLoading(true);
    try {
      await API.post("/admin/files/write", { path: editingFile?.path, content: fileContent }, { headers: hdrs() });
      setIsEditorOpen(false); setEditingFile(null); setFileContent(""); fetchFiles();
    } catch (err: any) { alert(err.response?.data?.message || "Failed to save file."); }
    finally { setActionLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(""); setActionLoading(true);
    try {
      await API.post("/admin/files/create", { path: `${currentPath}/${newItemName}`, type: createType }, { headers: hdrs() });
      setNewItemName(""); setIsCreateOpen(false); fetchFiles();
    } catch (err: any) { setErrorMsg(err.response?.data?.message || "Failed to create."); }
    finally { setActionLoading(false); }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    try {
      await API.post("/admin/files/rename", { path: selectedPaths[0], new_name: renameName }, { headers: hdrs() });
      setIsRenameOpen(false); setSelectedPaths([]); fetchFiles();
    } catch (err: any) { alert(err.response?.data?.message || "Rename failed."); }
    finally { setActionLoading(false); }
  };

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    try {
      await API.post("/admin/files/copy", { source_path: selectedPaths[0], destination_path: copyDest }, { headers: hdrs() });
      setIsCopyOpen(false); setSelectedPaths([]); fetchFiles();
    } catch (err: any) { alert(err.response?.data?.message || "Copy failed."); }
    finally { setActionLoading(false); }
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    try {
      await API.post("/admin/files/move", { source_path: selectedPaths[0], destination_path: moveDest }, { headers: hdrs() });
      setIsMoveOpen(false); setSelectedPaths([]); fetchFiles();
    } catch (err: any) { alert(err.response?.data?.message || "Move failed."); }
    finally { setActionLoading(false); }
  };

  const handleCompress = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    try {
      await API.post("/admin/files/compress", { paths: selectedPaths, zip_name: zipName, destination_path: currentPath }, { headers: hdrs() });
      setIsCompressOpen(false); setSelectedPaths([]); fetchFiles();
    } catch (err: any) { alert(err.response?.data?.message || "Compression failed."); }
    finally { setActionLoading(false); }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    try {
      await API.post("/admin/files/extract", { path: selectedPaths[0], destination: extractDest }, { headers: hdrs(), timeout: 600000 });
      setIsExtractOpen(false); setSelectedPaths([]); fetchFiles();
    } catch (err: any) { alert(err.response?.data?.message || "Extraction failed."); }
    finally { setActionLoading(false); }
  };

  const handleChmod = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    try {
      await API.post("/admin/files/chmod", { path: selectedPaths[0], permissions: calcOctal(permOwner, permGroup, permOther) }, { headers: hdrs() });
      setIsPermsOpen(false); setSelectedPaths([]); fetchFiles();
    } catch (err: any) { alert(err.response?.data?.message || "Failed to change permissions."); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await API.delete("/admin/files", { data: { paths: selectedPaths }, headers: hdrs() });
      setIsDeleteOpen(false); setSelectedPaths([]); fetchFiles();
    } catch (err: any) { alert(err.response?.data?.message || "Delete failed."); }
    finally { setActionLoading(false); }
  };

  const triggerDownload = () => {
    if (selectedPaths.length === 0) return;
    const item = fileItems.find(i => i.path === selectedPaths[0]);
    if (selectedPaths.length === 1 && item?.type === "file") {
      window.open(`${API.defaults.baseURL}/admin/files/download?path=${encodeURIComponent(selectedPaths[0])}&hosting_account_id=${selectedAccountId}`, "_blank");
    } else {
      const qs = selectedPaths.map(p => `paths[]=${encodeURIComponent(p)}`).join("&");
      window.open(`${API.defaults.baseURL}/admin/files/download-zip?${qs}&hosting_account_id=${selectedAccountId}`, "_blank");
    }
  };

  const performSearch = async (val: string) => {
    if (!val) { setIsSearching(false); return; }
    setIsSearching(true);
    try {
      const res = await API.get("/admin/files/search", { params: { query: val, path: currentPath }, headers: hdrs() });
      setSearchResults(res.data.data || []);
    } catch { setSearchResults([]); }
  };

  // Upload
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.files) addToQueue(Array.from(e.dataTransfer.files)); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) addToQueue(Array.from(e.target.files)); };
  const addToQueue = (files: File[]) => setUploadFiles(prev => [...prev, ...files.map(f => ({ file: f, progress: 0, status: "pending" as const }))]);

  const startUploading = async () => {
    const copy = [...uploadFiles];
    for (let i = 0; i < copy.length; i++) {
      if (copy[i].status === "success") continue;
      copy[i].status = "uploading"; setUploadFiles([...copy]);
      const fd = new FormData(); fd.append("file", copy[i].file); fd.append("path", currentPath);
      try {
        await API.post("/admin/files/upload", fd, {
          headers: { "Content-Type": "multipart/form-data", ...hdrs() },
          onUploadProgress: (p) => { copy[i].progress = Math.round((p.loaded * 100) / (p.total || p.loaded)); setUploadFiles([...copy]); }
        });
        copy[i].status = "success";
      } catch (err: any) { copy[i].status = "error"; copy[i].error = err.response?.data?.message || "Upload failed."; }
      setUploadFiles([...copy]);
    }
    fetchFiles();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
            <FolderSync className="w-7 h-7 text-primary animate-pulse" />
            Admin File Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">Browse, edit, zip, extract, and manage customer files across all hosting accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm min-w-[280px]">
            <HardDrive className="w-4 h-4 text-primary" />
            <div className="flex-grow">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Account</label>
              {loadingAccounts ? (
                <span className="text-xs text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</span>
              ) : (
                <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full text-xs font-bold text-gray-800 focus:outline-none bg-transparent cursor-pointer">
                  {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.domain} ({acc.system_username})</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="relative w-60">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input type="text" placeholder="Search files..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); performSearch(e.target.value); }}
              className="w-full text-xs pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-sm bg-white" />
            {searchQuery && <button onClick={() => { setSearchQuery(""); setIsSearching(false); }} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-3 flex flex-wrap gap-2 items-center justify-between text-xs font-semibold text-gray-700">
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => { setCreateType("directory"); setIsCreateOpen(true); }} className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors">
            <FolderPlus className="w-4 h-4 text-blue-500" /><span>New Folder</span></button>
          <button onClick={() => { setCreateType("file"); setIsCreateOpen(true); }} className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors">
            <FileCode className="w-4 h-4 text-purple-500" /><span>New File</span></button>
          <button onClick={() => { setUploadFiles([]); setIsUploadOpen(true); }} className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors">
            <Upload className="w-4 h-4 text-green-500" /><span>Upload</span></button>
          <span className="w-px h-6 bg-gray-200 mx-1"></span>
          <button onClick={triggerDownload} disabled={selectedPaths.length === 0} className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40">
            <Download className="w-4 h-4 text-indigo-500" /><span>Download</span></button>
          <button onClick={() => { const it = getSelectedSingleItem(); if (it) { setRenameName(it.name); setIsRenameOpen(true); } }} disabled={selectedPaths.length !== 1}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40">
            <Edit className="w-4 h-4 text-yellow-500" /><span>Rename</span></button>
          <button onClick={() => { if (selectedPaths.length > 0) { setCopyDest(currentPath); setIsCopyOpen(true); } }} disabled={selectedPaths.length === 0}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40">
            <CopyIcon className="w-4 h-4 text-cyan-500" /><span>Copy</span></button>
          <button onClick={() => { if (selectedPaths.length > 0) { setMoveDest(currentPath); setIsMoveOpen(true); } }} disabled={selectedPaths.length === 0}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40">
            <Scissors className="w-4 h-4 text-pink-500" /><span>Move</span></button>
          <button onClick={() => { if (selectedPaths.length > 0) { setZipName("archive.zip"); setIsCompressOpen(true); } }} disabled={selectedPaths.length === 0}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40">
            <Archive className="w-4 h-4 text-emerald-500" /><span>Compress</span></button>
          <button onClick={() => { const it = getSelectedSingleItem(); if (it) { setExtractDest(currentPath); setIsExtractOpen(true); } }}
            disabled={selectedPaths.length !== 1 || getExt(getSelectedSingleItem()?.name || "") !== "zip"}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40">
            <DownloadCloud className="w-4 h-4 text-orange-500" /><span>Extract</span></button>
          <button onClick={() => { const it = getSelectedSingleItem(); if (it) { loadPerms(it.permissions); setIsPermsOpen(true); } }} disabled={selectedPaths.length !== 1}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40">
            <Lock className="w-4 h-4 text-rose-500" /><span>Permissions</span></button>
        </div>
        <button onClick={() => { if (selectedPaths.length > 0) setIsDeleteOpen(true); }} disabled={selectedPaths.length === 0}
          className="hover:bg-red-50 text-red-600 hover:text-red-700 px-3.5 py-2.5 rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors disabled:opacity-40">
          <Trash2 className="w-4 h-4" /><span>Delete</span></button>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 shadow-sm font-mono text-xs text-gray-600">
        <button onClick={handleNavigateUp} disabled={currentPath === "public_html" || !currentPath.includes("/")}
          className={`p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${currentPath === "public_html" || !currentPath.includes("/") ? "opacity-30 cursor-not-allowed" : ""}`}>
          <ArrowLeft className="w-4 h-4 text-gray-500" /></button>
        <span className="font-bold text-gray-400">/home/{activeAccount?.system_username || "user"}/</span>
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
          {currentPath.split("/").map((part, idx, arr) => (
            <React.Fragment key={idx}>
              <span onClick={() => handleNavigate(arr.slice(0, idx + 1).join("/"))} className="hover:underline cursor-pointer font-bold text-primary">{part}</span>
              {idx < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
            </React.Fragment>
          ))}
        </div>
        <button onClick={fetchFiles} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      {/* File Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between"
        onDragOver={handleDragOver} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length > 0) { addToQueue(Array.from(e.dataTransfer.files)); setIsUploadOpen(true); } }}>
        {loadingFiles ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2 p-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="font-semibold text-xs text-gray-400 uppercase tracking-widest animate-pulse">Loading Files...</span>
          </div>
        ) : isSearching ? (
          <div className="overflow-x-auto flex-1">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Search Results for &quot;{searchQuery}&quot;</span>
              <button onClick={() => { setSearchQuery(""); setIsSearching(false); }} className="text-primary hover:underline text-xs font-bold">Clear</button>
            </div>
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-gray-400 gap-2">
                <Search className="w-10 h-10 text-gray-200" /><p className="font-semibold text-gray-500">No matching files.</p></div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th><th className="px-6 py-4">Path</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                  {searchResults.map((item: any) => (
                    <tr key={item.path} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                        {item.type === "directory" ? <Folder className="w-4 h-4 text-blue-500" /> : <File className="w-4 h-4 text-gray-400" />}
                        <button onClick={() => { setIsSearching(false); setSearchQuery(""); handleNavigate(item.type === "directory" ? item.path : item.path.substring(0, item.path.lastIndexOf("/"))); }}
                          className="hover:underline font-bold text-primary text-left">{item.name}</button></td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">{item.path}</td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500 capitalize">{item.type}</td>
                      <td className="px-6 py-4 text-xs text-primary font-bold">
                        <button onClick={() => { setIsSearching(false); setSearchQuery(""); handleNavigate(item.type === "directory" ? item.path : item.path.substring(0, item.path.lastIndexOf("/"))); }}
                          className="hover:underline">Go to Location</button></td></tr>))}
                </tbody></table>)}
          </div>
        ) : fileItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 p-12 select-none">
            <FolderOpen className="w-16 h-16 text-gray-100" /><p className="font-semibold text-gray-500">Directory is empty</p>
            <p className="text-xs">Drag &amp; drop files or click &quot;Upload&quot; to add content.</p></div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4 w-12 text-center">
                  <input type="checkbox" checked={selectedPaths.length === fileItems.length && fileItems.length > 0}
                    onChange={(e) => setSelectedPaths(e.target.checked ? fileItems.map(i => i.path) : [])}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer" /></th>
                <th className="px-6 py-4">Name</th><th className="px-6 py-4">Size</th>
                <th className="px-6 py-4 text-center">Permissions</th><th className="px-6 py-4 text-center">Modified</th>
                <th className="px-6 py-4 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {fileItems.map((item) => {
                  const isSel = selectedPaths.includes(item.path);
                  const icon = getFileIconInfo(item);
                  return (
                    <tr key={item.path} onClick={(e) => handleItemClick(item, e)} onDoubleClick={() => handleItemDoubleClick(item)}
                      onContextMenu={(e) => { e.preventDefault(); setSelectedPaths([item.path]); setContextMenu({ x: e.clientX, y: e.clientY, item }); }}
                      className={`cursor-pointer transition-colors duration-150 ${isSel ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-gray-50/50"}`}>
                      <td className="px-6 py-4 text-center w-12" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSel}
                          onChange={(e) => setSelectedPaths(e.target.checked ? [...selectedPaths, item.path] : selectedPaths.filter(p => p !== item.path))}
                          className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer" /></td>
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        <div className="flex items-center gap-3">{icon.component}<span className="truncate max-w-xs">{item.name}</span></div></td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">
                        {item.type === "directory" ? <span className="text-gray-300">&mdash;</span> : formatBytes(item.size)}</td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-gray-400">{item.permissions}</td>
                      <td className="px-6 py-4 text-center text-xs text-gray-400">{new Date(item.modified * 1000).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedPaths([item.path]); setContextMenu({ x: e.clientX, y: e.clientY, item }); }}
                          className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-all">
                          <MoreVertical className="w-4 h-4" /></button></td></tr>);
                })}
              </tbody></table></div>)}
      </div>

      {/* Context Menu */}
      {contextMenu && (<>
        <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
        <div style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-48 text-xs font-semibold text-gray-700 select-none animate-in fade-in duration-100">
          {contextMenu.item.type === "file" && (
            <button onClick={() => handleReadFile(contextMenu.item)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors">
              <Edit className="w-3.5 h-3.5 text-yellow-500" /><span>Edit Code</span></button>)}
          <button onClick={triggerDownload} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors">
            <Download className="w-3.5 h-3.5 text-indigo-500" /><span>Download</span></button>
          <button onClick={() => { setRenameName(contextMenu.item.name); setIsRenameOpen(true); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors">
            <Edit className="w-3.5 h-3.5 text-blue-500" /><span>Rename</span></button>
          <button onClick={() => { setCopyDest(currentPath); setIsCopyOpen(true); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors">
            <CopyIcon className="w-3.5 h-3.5 text-cyan-500" /><span>Copy</span></button>
          <button onClick={() => { setMoveDest(currentPath); setIsMoveOpen(true); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors">
            <Scissors className="w-3.5 h-3.5 text-pink-500" /><span>Move</span></button>
          <button onClick={() => { setZipName("archive.zip"); setIsCompressOpen(true); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors">
            <Archive className="w-3.5 h-3.5 text-emerald-500" /><span>Compress</span></button>
          {getExt(contextMenu.item.name) === "zip" && (
            <button onClick={() => { setExtractDest(currentPath); setIsExtractOpen(true); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors">
              <DownloadCloud className="w-3.5 h-3.5 text-orange-500" /><span>Extract</span></button>)}
          <button onClick={() => { loadPerms(contextMenu.item.permissions); setIsPermsOpen(true); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors">
            <Lock className="w-3.5 h-3.5 text-rose-500" /><span>Permissions</span></button>
          <div className="border-t border-gray-100 my-1"></div>
          <button onClick={() => setIsDeleteOpen(true)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 hover:text-red-700 text-left transition-colors">
            <Trash2 className="w-3.5 h-3.5" /><span>Delete</span></button>
        </div></>)}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Upload className="w-5 h-5 text-green-500" /> Upload files to {currentPath}</h2>
              <button onClick={() => setIsUploadOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button></div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-primary bg-gray-50 hover:bg-primary/5 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5">
                <DownloadCloud className="w-10 h-10 text-gray-400" />
                <p className="text-xs font-bold text-gray-700">Drag &amp; Drop files here or click to browse</p>
                <p className="text-[10px] text-gray-400 mt-1">Select multiple files for batch uploads</p>
                <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" /></div>
              {uploadFiles.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Queue ({uploadFiles.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                    {uploadFiles.map((item, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="truncate max-w-[240px] text-gray-800">{item.file.name}</span>
                          <span className="text-[10px] text-gray-400">{formatBytes(item.file.size)}</span></div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className={`h-full transition-all duration-200 ${item.status === "error" ? "bg-red-500" : item.status === "success" ? "bg-green-500" : "bg-primary"}`}
                              style={{ width: `${item.progress}%` }} /></div>
                          <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{item.progress}%</span></div>
                        {item.status === "error" && <p className="text-[10px] text-red-500 font-semibold">{item.error}</p>}
                      </div>))}
                  </div></div>)}
            </div>
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsUploadOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-100 text-gray-500">Close</button>
              <button onClick={startUploading} disabled={uploadFiles.length === 0 || uploadFiles.every(f => f.status === "success")}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /><span>Upload Queue</span></button></div>
          </div></div>)}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                {createType === "file" ? <FileCode className="w-5 h-5 text-purple-500" /> : <FolderPlus className="w-5 h-5 text-blue-500" />}
                Create New {createType === "file" ? "File" : "Folder"}</h2>
              <button onClick={() => { setIsCreateOpen(false); setErrorMsg(""); setNewItemName(""); }} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button></div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg font-semibold">{errorMsg}</div>}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Name</label>
                <input type="text" placeholder={createType === "file" ? "e.g. index.php" : "e.g. assets"} value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary" required autoFocus /></div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => { setIsCreateOpen(false); setErrorMsg(""); }} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button type="submit" disabled={actionLoading} className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}<span>Create</span></button></div>
            </form></div></div>)}

      {/* Rename Modal */}
      {isRenameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Edit className="w-5 h-5 text-yellow-500" /> Rename Item</h2>
              <button onClick={() => setIsRenameOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button></div>
            <form onSubmit={handleRename} className="p-6 space-y-4">
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">New Name</label>
                <input type="text" value={renameName} onChange={(e) => setRenameName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary" required autoFocus /></div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsRenameOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button type="submit" disabled={actionLoading} className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}<span>Rename</span></button></div>
            </form></div></div>)}

      {/* Copy Modal */}
      {isCopyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><CopyIcon className="w-5 h-5 text-cyan-500" /> Copy Item</h2>
              <button onClick={() => setIsCopyOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button></div>
            <form onSubmit={handleCopy} className="p-6 space-y-4">
              <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Source</p>
                <p className="text-xs text-gray-700 font-semibold break-all bg-gray-50 p-2 rounded-lg">{selectedPaths[0]}</p></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Destination</label>
                <input type="text" value={copyDest} onChange={(e) => setCopyDest(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary font-mono" required autoFocus /></div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsCopyOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button type="submit" disabled={actionLoading} className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}<span>Copy</span></button></div>
            </form></div></div>)}

      {/* Move Modal */}
      {isMoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Scissors className="w-5 h-5 text-pink-500" /> Move Item</h2>
              <button onClick={() => setIsMoveOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button></div>
            <form onSubmit={handleMove} className="p-6 space-y-4">
              <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Source</p>
                <p className="text-xs text-gray-700 font-semibold break-all bg-gray-50 p-2 rounded-lg">{selectedPaths[0]}</p></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Destination</label>
                <input type="text" value={moveDest} onChange={(e) => setMoveDest(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary font-mono" required autoFocus /></div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsMoveOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button type="submit" disabled={actionLoading} className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}<span>Move</span></button></div>
            </form></div></div>)}

      {/* Compress Modal */}
      {isCompressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Archive className="w-5 h-5 text-emerald-500" /> Compress Items</h2>
              <button onClick={() => setIsCompressOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button></div>
            <form onSubmit={handleCompress} className="p-6 space-y-4">
              <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Items ({selectedPaths.length})</p>
                <div className="max-h-24 overflow-y-auto bg-gray-50 p-2 rounded-lg text-xs text-gray-600 space-y-1">
                  {selectedPaths.map(p => <div key={p} className="truncate">{p}</div>)}</div></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">ZIP Filename</label>
                <input type="text" value={zipName} onChange={(e) => setZipName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary" required autoFocus /></div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsCompressOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button type="submit" disabled={actionLoading} className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}<span>Compress</span></button></div>
            </form></div></div>)}

      {/* Extract Modal */}
      {isExtractOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><DownloadCloud className="w-5 h-5 text-orange-500" /> Extract ZIP</h2>
              <button onClick={() => setIsExtractOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button></div>
            <form onSubmit={handleExtract} className="p-6 space-y-4">
              <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Archive</p>
                <p className="text-xs text-gray-700 font-semibold break-all bg-gray-50 p-2 rounded-lg">{selectedPaths[0]}</p></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Extract To</label>
                <input type="text" value={extractDest} onChange={(e) => setExtractDest(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary font-mono" required autoFocus /></div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsExtractOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button type="submit" disabled={actionLoading} className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}<span>Extract</span></button></div>
            </form></div></div>)}

      {/* Permissions Modal */}
      {isPermsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Lock className="w-5 h-5 text-rose-500" /> Permissions</h2>
              <button onClick={() => setIsPermsOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button></div>
            <form onSubmit={handleChmod} className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex justify-between items-center text-xs font-bold select-none">
                <span className="text-gray-500 uppercase tracking-widest">Octal</span>
                <span className="text-lg text-primary font-mono bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">{calcOctal(permOwner, permGroup, permOther)}</span></div>
              <div className="grid grid-cols-4 gap-3 text-center text-xs select-none">
                <div className="font-bold text-gray-400 uppercase tracking-wider text-left pt-2">Scope</div>
                <div className="font-bold text-gray-700">Read</div><div className="font-bold text-gray-700">Write</div><div className="font-bold text-gray-700">Execute</div>
                {([{l:"User",s:permOwner,fn:setPermOwner},{l:"Group",s:permGroup,fn:setPermGroup},{l:"Other",s:permOther,fn:setPermOther}] as const).map(({l,s,fn}) => (
                  <React.Fragment key={l}>
                    <div className="font-bold text-gray-500 text-left pt-1">{l}</div>
                    {(["read","write","execute"] as const).map(p => (
                      <div key={p}><input type="checkbox" checked={s[p]} onChange={(e) => fn({...s, [p]: e.target.checked})}
                        className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer" /></div>))}
                  </React.Fragment>))}
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsPermsOpen(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button type="submit" disabled={actionLoading} className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1">
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}<span>Apply</span></button></div>
            </form></div></div>)}

      {/* Delete Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-500" /> Confirm Deletion</h2>
              <button onClick={() => setIsDeleteOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button></div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs font-bold text-red-700 flex items-start gap-2.5">
                <Lock className="w-5 h-5 flex-shrink-0 text-red-600" />
                <div><p className="uppercase tracking-wider">Warning: Critical Action</p>
                  <p className="font-medium text-red-600 mt-0.5">This action is permanent and cannot be undone!</p></div></div>
              <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Items ({selectedPaths.length})</p>
                <div className="max-h-28 overflow-y-auto bg-gray-50 border border-gray-100 p-2.5 rounded-lg text-xs text-gray-600 space-y-1 font-mono">
                  {selectedPaths.map(p => <div key={p} className="truncate">{p}</div>)}</div></div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500">Cancel</button>
                <button onClick={handleDelete} disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5">
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}<Trash2 className="w-3.5 h-3.5" /><span>Delete Permanently</span></button></div>
            </div></div></div>)}

      {/* Code Editor */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 animate-in fade-in duration-200">
          <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between text-white select-none shadow-md">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-primary" />
              <div><h3 className="font-bold text-xs tracking-wider">{editingFile?.name}</h3>
                <p className="text-[9px] text-gray-500 font-mono tracking-widest mt-0.5">LOCATION: /home/{activeAccount?.system_username}/{editingFile?.path}</p></div></div>
            <div className="flex items-center gap-3 text-xs">
              <span className="bg-gray-800 text-primary border border-gray-700 font-mono font-bold text-[9px] px-2.5 py-1 rounded-md uppercase tracking-widest">
                {getExt(editingFile?.name || "") || "txt"}</span>
              <button onClick={handleSaveFile} disabled={actionLoading}
                className="bg-primary hover:bg-primary-hover disabled:bg-gray-800 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-1.5">
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}<span>Save</span></button>
              <button onClick={() => { setIsEditorOpen(false); setEditingFile(null); setFileContent(""); }}
                className="text-gray-400 hover:text-white px-3 py-2 font-bold">Cancel</button></div></div>
          <div className="flex-1 flex overflow-hidden">
            <div className="bg-gray-900/50 text-gray-600 font-mono text-xs px-4 py-6 text-right select-none border-r border-gray-800/40 min-w-12 leading-relaxed">
              {Array(Math.max(1, fileContent.split("\n").length)).fill(0).map((_, i) => <div key={i}>{i + 1}</div>)}</div>
            <textarea value={fileContent} onChange={(e) => setFileContent(e.target.value)}
              className="flex-1 bg-gray-950 text-gray-200 font-mono text-xs p-6 focus:outline-none resize-none overflow-y-auto leading-relaxed tab-size-4" spellCheck="false" /></div>
        </div>)}
    </div>
  );
}
