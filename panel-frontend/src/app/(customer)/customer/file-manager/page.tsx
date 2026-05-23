"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  Folder, 
  File, 
  Plus, 
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
  Check,
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
  Grid
} from "lucide-react";

interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
  permissions: string;
  is_writable: boolean;
  extension: string;
}

export default function CustomerFileManager() {
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Modals / Dialogs States
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

  // Upload States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<{ file: File; progress: number; status: "pending" | "uploading" | "success" | "error"; error?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context Menu & Droplist
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem } | null>(null);
  const [activeDropItem, setActiveDropItem] = useState<string | null>(null);

  // Error States
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch file list
  const { data: filesRes, isLoading, refetch } = useQuery({
    queryKey: ["customer", "files", currentPath],
    queryFn: async () => {
      const res = await API.get(`/customer/files?path=${encodeURIComponent(currentPath)}`);
      return res.data.data;
    }
  });

  const fileItems: FileItem[] = filesRes?.items || [];
  const currentNormalizedPath = filesRes?.current_path || currentPath;

  // Clear selections on path navigation
  useEffect(() => {
    setSelectedPaths([]);
  }, [currentPath]);

  // Context Menu closer
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // API Mutators
  // Create File/Folder
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/files/create", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      refetch();
      setIsCreateOpen(false);
      setNewItemName("");
      setErrorMsg("");
      setSelectedPaths([]);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to create item.");
    }
  });

  // Rename Mutation
  const renameMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/files/rename", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      refetch();
      setIsRenameOpen(false);
      setRenameName("");
      setSelectedPaths([]);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Rename failed.")
  });

  // Copy Mutation
  const copyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/files/copy", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      refetch();
      setIsCopyOpen(false);
      setSelectedPaths([]);
      alert("Item copied successfully.");
    },
    onError: (err: any) => alert(err.response?.data?.message || "Copy failed.")
  });

  // Move Mutation
  const moveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/files/move", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      refetch();
      setIsMoveOpen(false);
      setSelectedPaths([]);
      alert("Item moved successfully.");
    },
    onError: (err: any) => alert(err.response?.data?.message || "Move failed.")
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.delete("/customer/files", { data: payload });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      refetch();
      setIsDeleteOpen(false);
      setSelectedPaths([]);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Delete failed.")
  });

  // Read File Content
  const readFileMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const res = await API.get(`/customer/files/read?path=${encodeURIComponent(filePath)}`);
      return res.data.data;
    },
    onSuccess: (data: any) => {
      setFileContent(data.content || "");
      setIsEditorOpen(true);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to read file.")
  });

  // Save File Content
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
      refetch();
      alert("File saved successfully.");
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to save file.")
  });

  // Compress Mutation
  const compressMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/files/compress", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      refetch();
      setIsCompressOpen(false);
      setSelectedPaths([]);
      alert("Archive created successfully.");
    },
    onError: (err: any) => alert(err.response?.data?.message || "Compression failed.")
  });

  // Extract Mutation
  const extractMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/files/extract", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      refetch();
      setIsExtractOpen(false);
      setSelectedPaths([]);
      alert("Archive extracted successfully.");
    },
    onError: (err: any) => alert(err.response?.data?.message || "Extraction failed.")
  });

  // Chmod Permission Mutation
  const chmodMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/files/chmod", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
      refetch();
      setIsPermsOpen(false);
      setSelectedPaths([]);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to apply permissions.")
  });

  // Search Mutation
  const performSearch = async (val: string) => {
    if (!val) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await API.get(`/customer/files/search?query=${encodeURIComponent(val)}&path=${encodeURIComponent(currentPath)}`);
      setSearchResults(res.data.data || []);
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    }
  };

  // Navigations & Directory double-click
  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleNavigateUp = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath("/" + parts.join("/"));
  };

  const handleItemClick = (item: FileItem, e: React.MouseEvent) => {
    if (e.ctrlKey) {
      if (selectedPaths.includes(item.path)) {
        setSelectedPaths(selectedPaths.filter(p => p !== item.path));
      } else {
        setSelectedPaths([...selectedPaths, item.path]);
      }
    } else {
      setSelectedPaths([item.path]);
    }
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.type === "directory") {
      handleNavigate(item.path);
    } else {
      setEditingFile(item);
      readFileMutation.mutate(item.path);
    }
  };

  const handleRowContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setSelectedPaths([item.path]);
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  // File Icons Helper
  const getFileIconInfo = (item: FileItem) => {
    if (item.type === "directory") {
      return { component: <Folder className="w-5 h-5 text-blue-500 fill-blue-100" />, color: "text-blue-500" };
    }
    const ext = item.extension || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
      return { component: <ImageIcon className="w-5 h-5 text-green-500" />, color: "text-green-500" };
    }
    if (ext === "php") {
      return { component: <FileCode className="w-5 h-5 text-purple-500" />, color: "text-purple-500" };
    }
    if (["html", "css"].includes(ext)) {
      return { component: <Globe className="w-5 h-5 text-orange-500" />, color: "text-orange-500" };
    }
    if (["js", "ts", "jsx", "tsx", "json"].includes(ext)) {
      return { component: <Terminal className="w-5 h-5 text-yellow-500" />, color: "text-yellow-600" };
    }
    if (["zip", "tar", "gz", "rar"].includes(ext)) {
      return { component: <FileArchive className="w-5 h-5 text-gray-500" />, color: "text-gray-500" };
    }
    if (ext === "sql") {
      return { component: <FileSpreadsheet className="w-5 h-5 text-indigo-500" />, color: "text-indigo-500" };
    }
    return { component: <File className="w-5 h-5 text-gray-400" />, color: "text-gray-400" };
  };

  // Human Readable Bytes formatter
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Permission Octal helper
  const calculateOctal = (owner: any, group: any, other: any) => {
    const o = (owner.read ? 4 : 0) + (owner.write ? 2 : 0) + (owner.execute ? 1 : 0);
    const g = (group.read ? 4 : 0) + (group.write ? 2 : 0) + (group.execute ? 1 : 0);
    const ot = (other.read ? 4 : 0) + (other.write ? 2 : 0) + (other.execute ? 1 : 0);
    return `${o}${g}${ot}`;
  };

  const loadPermissionsFromString = (permStr: string) => {
    const clean = permStr.length === 4 ? permStr.substring(1) : permStr;
    const o = parseInt(clean[0]) || 0;
    const g = parseInt(clean[1]) || 0;
    const ot = parseInt(clean[2]) || 0;
    
    setPermOwner({ read: (o & 4) !== 0, write: (o & 2) !== 0, execute: (o & 1) !== 0 });
    setPermGroup({ read: (g & 4) !== 0, write: (g & 2) !== 0, execute: (g & 1) !== 0 });
    setPermOther({ read: (ot & 4) !== 0, write: (ot & 2) !== 0, execute: (ot & 1) !== 0 });
  };

  const triggerDownloadSelected = () => {
    if (selectedPaths.length === 0) return;
    if (selectedPaths.length === 1) {
      const selectedItem = fileItems.find(i => i.path === selectedPaths[0]);
      if (selectedItem?.type === "file") {
        window.open(`${API.defaults.baseURL}/customer/files/download?path=${encodeURIComponent(selectedPaths[0])}&hosting_account_id=${localStorage.getItem("qiw_hosting_account_id") || ""}`, "_blank");
      } else {
        // trigger zip download for directory
        window.open(`${API.defaults.baseURL}/customer/files/download-zip?paths=${encodeURIComponent(selectedPaths[0])}&hosting_account_id=${localStorage.getItem("qiw_hosting_account_id") || ""}`, "_blank");
      }
    } else {
      // batch zip download
      const qs = selectedPaths.map(p => `paths[]=${encodeURIComponent(p)}`).join("&");
      window.open(`${API.defaults.baseURL}/customer/files/download-zip?${qs}&hosting_account_id=${localStorage.getItem("qiw_hosting_account_id") || ""}`, "_blank");
    }
  };

  // Upload Logic
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.files) return;
    const files = Array.from(e.dataTransfer.files);
    addFilesToUploadQueue(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    addFilesToUploadQueue(files);
  };

  const addFilesToUploadQueue = (files: File[]) => {
    const fresh = files.map(file => ({
      file,
      progress: 0,
      status: "pending" as const
    }));
    setUploadFiles(prev => [...prev, ...fresh]);
  };

  const startFilesUploading = async () => {
    const copy = [...uploadFiles];
    for (let i = 0; i < copy.length; i++) {
      if (copy[i].status === "success") continue;
      copy[i].status = "uploading";
      setUploadFiles([...copy]);

      const item = copy[i];
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("path", currentPath);

      try {
        await API.post("/customer/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded));
            copy[i].progress = percentCompleted;
            setUploadFiles([...copy]);
          }
        });
        copy[i].status = "success";
      } catch (err: any) {
        copy[i].status = "error";
        copy[i].error = err.response?.data?.message || "Upload failed.";
      }
      setUploadFiles([...copy]);
    }
    queryClient.invalidateQueries({ queryKey: ["customer", "files", currentPath] });
    refetch();
    setSelectedPaths([]);
  };

  // Selection state checkers
  const getSelectedSingleItem = () => {
    if (selectedPaths.length !== 1) return null;
    return fileItems.find(i => i.path === selectedPaths[0]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 select-none pb-12">
      {/* 1. Header and description */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
            <FolderSync className="w-7 h-7 text-primary animate-pulse" />
            cPanel Web File Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse, manage, edit, upload, zip, and configure file permissions within your isolated system jail folder.
          </p>
        </div>
        
        {/* Search Input Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              performSearch(e.target.value);
            }}
            className="w-full text-xs pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-sm bg-white"
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setIsSearching(false); }}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Toolbar */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-3 flex flex-wrap gap-2 items-center justify-between text-xs font-semibold text-gray-700">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => { setCreateType("directory"); setIsCreateOpen(true); }}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-blue-500" />
            <span>New Folder</span>
          </button>
          
          <button
            onClick={() => { setCreateType("file"); setIsCreateOpen(true); }}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors"
          >
            <FileCode className="w-4 h-4 text-purple-500" />
            <span>New File</span>
          </button>

          <button
            onClick={() => { setUploadFiles([]); setIsUploadOpen(true); }}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-4 h-4 text-green-500" />
            <span>Upload</span>
          </button>

          <span className="w-px h-6 bg-gray-200 mx-1"></span>

          <button
            onClick={triggerDownloadSelected}
            disabled={selectedPaths.length === 0}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Download</span>
          </button>

          <button
            onClick={() => {
              const item = getSelectedSingleItem();
              if (item) {
                setRenameName(item.name);
                setIsRenameOpen(true);
              }
            }}
            disabled={selectedPaths.length !== 1}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-white"
          >
            <Edit className="w-4 h-4 text-yellow-500" />
            <span>Rename</span>
          </button>

          <button
            onClick={() => {
              if (selectedPaths.length > 0) {
                setCopyDest(currentPath);
                setIsCopyOpen(true);
              }
            }}
            disabled={selectedPaths.length === 0}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-white"
          >
            <CopyIcon className="w-4 h-4 text-cyan-500" />
            <span>Copy</span>
          </button>

          <button
            onClick={() => {
              if (selectedPaths.length > 0) {
                setMoveDest(currentPath);
                setIsMoveOpen(true);
              }
            }}
            disabled={selectedPaths.length === 0}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-white"
          >
            <Scissors className="w-4 h-4 text-pink-500" />
            <span>Move</span>
          </button>

          <button
            onClick={() => {
              if (selectedPaths.length > 0) {
                setZipName("archive.zip");
                setIsCompressOpen(true);
              }
            }}
            disabled={selectedPaths.length === 0}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-white"
          >
            <Archive className="w-4 h-4 text-emerald-500" />
            <span>Compress</span>
          </button>

          <button
            onClick={() => {
              const item = getSelectedSingleItem();
              if (item && item.extension === "zip") {
                setExtractDest(currentPath);
                setIsExtractOpen(true);
              }
            }}
            disabled={selectedPaths.length !== 1 || getSelectedSingleItem()?.extension !== "zip"}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-white"
          >
            <DownloadCloud className="w-4 h-4 text-orange-500" />
            <span>Extract</span>
          </button>

          <button
            onClick={() => {
              const item = getSelectedSingleItem();
              if (item) {
                loadPermissionsFromString(item.permissions);
                setIsPermsOpen(true);
              }
            }}
            disabled={selectedPaths.length !== 1}
            className="hover:bg-gray-100 hover:text-primary px-3 py-2.5 rounded-lg border border-gray-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-white"
          >
            <Lock className="w-4 h-4 text-rose-500" />
            <span>Permissions</span>
          </button>
        </div>

        <div>
          <button
            onClick={() => {
              if (selectedPaths.length > 0) {
                setIsDeleteOpen(true);
              }
            }}
            disabled={selectedPaths.length === 0}
            className="hover:bg-red-50 text-red-600 hover:text-red-700 px-3.5 py-2.5 rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* 3. Breadcrumb Navigation Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 shadow-sm font-mono text-xs text-gray-600">
        <button
          onClick={handleNavigateUp}
          disabled={currentPath === "/"}
          className={`p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${
            currentPath === "/" ? "opacity-30 cursor-not-allowed" : ""
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
          <span 
            onClick={() => handleNavigate("/")}
            className="hover:underline cursor-pointer font-bold text-primary flex items-center gap-1.5"
          >
            <FolderOpen className="w-4 h-4 text-gray-400" />
            <span>Home</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          {currentPath.split("/").filter(Boolean).map((part, index, arr) => (
            <React.Fragment key={index}>
              <span 
                onClick={() => handleNavigate("/" + arr.slice(0, index + 1).join("/"))}
                className="hover:underline cursor-pointer font-bold text-primary"
              >
                {part}
              </span>
              {index < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 4. Main Catalog Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2 p-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="font-semibold text-xs text-gray-400 uppercase tracking-widest animate-pulse">Loading Web Files...</span>
          </div>
        ) : isSearching ? (
          /* Search Results Listing */
          <div className="overflow-x-auto flex-1">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Search Results for "{searchQuery}"</span>
              <button onClick={() => { setSearchQuery(""); setIsSearching(false); }} className="text-primary hover:underline text-xs font-bold">Clear Search</button>
            </div>
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-gray-400 gap-2">
                <Search className="w-10 h-10 text-gray-200" />
                <p className="font-semibold text-gray-500">No matching files found.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">Relative Path</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                  {searchResults.map((item: any) => (
                    <tr key={item.path} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                        {item.type === "directory" ? <Folder className="w-4 h-4 text-blue-500" /> : <File className="w-4 h-4 text-gray-400" />}
                        <button onClick={() => {
                          setIsSearching(false);
                          setSearchQuery("");
                          if (item.type === "directory") {
                            handleNavigate(item.path);
                          } else {
                            handleNavigate(item.path.substring(0, item.path.lastIndexOf("/")));
                          }
                        }} className="hover:underline font-bold text-primary text-left">
                          {item.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">{item.path}</td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500 capitalize">{item.type}</td>
                      <td className="px-6 py-4 text-xs text-primary font-bold">
                        <button onClick={() => {
                          setIsSearching(false);
                          setSearchQuery("");
                          if (item.type === "directory") {
                            handleNavigate(item.path);
                          } else {
                            handleNavigate(item.path.substring(0, item.path.lastIndexOf("/")));
                          }
                        }} className="hover:underline">Go to Location</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : fileItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 p-12 select-none">
            <FolderOpen className="w-16 h-16 text-gray-100" />
            <p className="font-semibold text-gray-500">Directory is empty</p>
            <p className="text-xs">Drag & drop files or click "Upload" on the toolbar to add content.</p>
          </div>
        ) : (
          /* Standard File manager listing */
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4 w-12 text-center">
                    <input 
                      type="checkbox"
                      checked={selectedPaths.length === fileItems.length && fileItems.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPaths(fileItems.map(i => i.path));
                        } else {
                          setSelectedPaths([]);
                        }
                      }}
                      className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4 text-center">Permissions</th>
                  <th className="px-6 py-4 text-center">Last Modified</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {fileItems.map((item: FileItem) => {
                  const isSelected = selectedPaths.includes(item.path);
                  const iconInfo = getFileIconInfo(item);

                  return (
                    <tr 
                      key={item.path} 
                      onClick={(e) => handleItemClick(item, e)}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                      onContextMenu={(e) => handleRowContextMenu(e, item)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-gray-50/50"
                      }`}
                    >
                      <td className="px-6 py-4 text-center w-12" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPaths([...selectedPaths, item.path]);
                            } else {
                              setSelectedPaths(selectedPaths.filter(p => p !== item.path));
                            }
                          }}
                          className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        <div className="flex items-center gap-3">
                          {iconInfo.component}
                          <span className="truncate max-w-xs md:max-w-md">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">
                        {item.type === "directory" ? <span className="text-gray-300">—</span> : formatBytes(item.size)}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-gray-400">
                        {item.permissions}
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-gray-400">
                        {new Date(item.modified * 1000).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPaths([item.path]);
                            setContextMenu({ x: e.clientX, y: e.clientY, item });
                          }}
                          className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-all"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Custom Right-Click Context Menu */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div 
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-48 text-xs font-semibold text-gray-700 select-none animate-in fade-in duration-100"
          >
            {contextMenu.item.type === "file" && (
              <button 
                onClick={() => { setEditingFile(contextMenu.item); readFileMutation.mutate(contextMenu.item.path); }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-yellow-500" />
                <span>Edit Code</span>
              </button>
            )}
            <button 
              onClick={triggerDownloadSelected}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Download</span>
            </button>
            <button 
              onClick={() => { setRenameName(contextMenu.item.name); setIsRenameOpen(true); }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-blue-500" />
              <span>Rename</span>
            </button>
            <button 
              onClick={() => { setCopyDest(currentPath); setIsCopyOpen(true); }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors"
            >
              <CopyIcon className="w-3.5 h-3.5 text-cyan-500" />
              <span>Copy</span>
            </button>
            <button 
              onClick={() => { setMoveDest(currentPath); setIsMoveOpen(true); }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors"
            >
              <Scissors className="w-3.5 h-3.5 text-pink-500" />
              <span>Move</span>
            </button>
            <button 
              onClick={() => { setZipName("archive.zip"); setIsCompressOpen(true); }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors"
            >
              <Archive className="w-3.5 h-3.5 text-emerald-500" />
              <span>Compress</span>
            </button>
            {contextMenu.item.extension === "zip" && (
              <button 
                onClick={() => { setExtractDest(currentPath); setIsExtractOpen(true); }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors"
              >
                <DownloadCloud className="w-3.5 h-3.5 text-orange-500" />
                <span>Extract</span>
              </button>
            )}
            <button 
              onClick={() => { loadPermissionsFromString(contextMenu.item.permissions); setIsPermsOpen(true); }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-left transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>Permissions</span>
            </button>
            <div className="border-t border-gray-100 my-1"></div>
            <button 
              onClick={() => setIsDeleteOpen(true)}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 hover:text-red-700 text-left transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}

      {/* 6. Upload Dialog Modal (Drag and Drop + Progress Bars) */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-500" />
                Upload files to {currentPath}
              </h2>
              <button onClick={() => setIsUploadOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            </div>
            
            {/* Drag & Drop Zone */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-primary bg-gray-50 hover:bg-primary/5 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5"
              >
                <DownloadCloud className="w-10 h-10 text-gray-400" />
                <div>
                  <p className="text-xs font-bold text-gray-700">Drag & Drop files here or click to browse</p>
                  <p className="text-[10px] text-gray-400 mt-1">Select multiple files for batch uploads</p>
                </div>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
              </div>

              {/* Uploading Files listing with individual progress bars */}
              {uploadFiles.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Files Queue ({uploadFiles.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                    {uploadFiles.map((item, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="truncate max-w-[240px] text-gray-800">{item.file.name}</span>
                          <span className="text-[10px] text-gray-400">{formatBytes(item.file.size)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-200 ${
                                item.status === "error" ? "bg-red-500" : item.status === "success" ? "bg-green-500" : "bg-primary"
                              }`} 
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{item.progress}%</span>
                        </div>
                        {item.status === "error" && (
                          <p className="text-[10px] text-red-500 font-semibold">{item.error || "Upload failed."}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-100 text-gray-500 transition-colors"
              >
                Close
              </button>
              <button
                onClick={startFilesUploading}
                disabled={uploadFiles.length === 0 || uploadFiles.every(f => f.status === "success")}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Item Creation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                {createType === "file" ? <FileCode className="w-5 h-5 text-purple-500" /> : <FolderPlus className="w-5 h-5 text-blue-500" />}
                Create New {createType === "file" ? "File" : "Folder"}
              </h2>
              <button onClick={() => { setIsCreateOpen(false); setErrorMsg(""); setNewItemName(""); }} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  path: currentPath === "/" ? `/${newItemName}` : `${currentPath}/${newItemName}`,
                  type: createType
                });
              }} 
              className="p-6 space-y-4"
            >
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                  Name
                </label>
                <input
                  type="text"
                  placeholder={createType === "file" ? "e.g. index.php" : "e.g. assets"}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-800"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); setErrorMsg(""); setNewItemName(""); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1"
                >
                  {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Rename Modal */}
      {isRenameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Edit className="w-5 h-5 text-yellow-500" />
                Rename Item
              </h2>
              <button onClick={() => setIsRenameOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                renameMutation.mutate({
                  path: selectedPaths[0],
                  new_name: renameName
                });
              }} 
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                  New Name
                </label>
                <input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-800"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRenameOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renameMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1"
                >
                  {renameMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Rename</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Copy Modal */}
      {isCopyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <CopyIcon className="w-5 h-5 text-cyan-500" />
                Copy Selected Item(s)
              </h2>
              <button onClick={() => setIsCopyOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                copyMutation.mutate({
                  source_path: selectedPaths[0],
                  destination_path: copyDest
                });
              }} 
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Item to Copy</p>
                <p className="text-xs text-gray-700 font-semibold break-all bg-gray-50 p-2 rounded-lg">{selectedPaths.join(", ")}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                  Destination Directory Path
                </label>
                <input
                  type="text"
                  value={copyDest}
                  onChange={(e) => setCopyDest(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-800 font-mono"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCopyOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={copyMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1"
                >
                  {copyMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Copy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Move Modal */}
      {isMoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Scissors className="w-5 h-5 text-pink-500" />
                Move Selected Item(s)
              </h2>
              <button onClick={() => setIsMoveOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                moveMutation.mutate({
                  source_path: selectedPaths[0],
                  destination_path: moveDest
                });
              }} 
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Item to Move</p>
                <p className="text-xs text-gray-700 font-semibold break-all bg-gray-50 p-2 rounded-lg">{selectedPaths.join(", ")}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                  Destination Directory Path
                </label>
                <input
                  type="text"
                  value={moveDest}
                  onChange={(e) => setMoveDest(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-800 font-mono"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsMoveOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={moveMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1"
                >
                  {moveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Move</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Compress Modal */}
      {isCompressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Archive className="w-5 h-5 text-emerald-500" />
                Compress Items into Archive
              </h2>
              <button onClick={() => setIsCompressOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                compressMutation.mutate({
                  paths: selectedPaths,
                  zip_name: zipName,
                  destination_path: currentPath
                });
              }} 
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Selected Items ({selectedPaths.length})</p>
                <div className="max-h-24 overflow-y-auto bg-gray-50 p-2 rounded-lg text-xs text-gray-600 space-y-1">
                  {selectedPaths.map(p => <div key={p} className="truncate">{p}</div>)}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                  ZIP Filename
                </label>
                <input
                  type="text"
                  value={zipName}
                  onChange={(e) => setZipName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-800"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCompressOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={compressMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1"
                >
                  {compressMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Compress</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. Extract Modal */}
      {isExtractOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-orange-500" />
                Extract ZIP Archive
              </h2>
              <button onClick={() => setIsExtractOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                extractMutation.mutate({
                  path: selectedPaths[0],
                  destination: extractDest
                });
              }} 
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ZIP Archive to Extract</p>
                <p className="text-xs text-gray-700 font-semibold break-all bg-gray-50 p-2 rounded-lg">{selectedPaths[0]}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                  Extraction Destination Directory
                </label>
                <input
                  type="text"
                  value={extractDest}
                  onChange={(e) => setExtractDest(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-800 font-mono"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsExtractOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extractMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1"
                >
                  {extractMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Extract</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. Permissions (Chmod) Modal */}
      {isPermsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-500" />
                Configure Permissions
              </h2>
              <button onClick={() => setIsPermsOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            </div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                chmodMutation.mutate({
                  path: selectedPaths[0],
                  permissions: calculateOctal(permOwner, permGroup, permOther)
                });
              }} 
              className="p-6 space-y-5"
            >
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex justify-between items-center text-xs font-bold select-none">
                <span className="text-gray-500 uppercase tracking-widest">Octal Permission Display</span>
                <span className="text-lg text-primary font-mono bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                  {calculateOctal(permOwner, permGroup, permOther)}
                </span>
              </div>

              {/* 3x3 Checkbox Grid */}
              <div className="grid grid-cols-4 gap-3 text-center text-xs select-none">
                <div className="font-bold text-gray-400 uppercase tracking-wider text-left pt-2">Scope</div>
                <div className="font-bold text-gray-700">Read</div>
                <div className="font-bold text-gray-700">Write</div>
                <div className="font-bold text-gray-700">Execute</div>

                {/* Owner Row */}
                <div className="font-bold text-gray-500 text-left pt-1">User</div>
                <div>
                  <input 
                    type="checkbox" 
                    checked={permOwner.read}
                    onChange={(e) => setPermOwner({ ...permOwner, read: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </div>
                <div>
                  <input 
                    type="checkbox" 
                    checked={permOwner.write}
                    onChange={(e) => setPermOwner({ ...permOwner, write: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </div>
                <div>
                  <input 
                    type="checkbox" 
                    checked={permOwner.execute}
                    onChange={(e) => setPermOwner({ ...permOwner, execute: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </div>

                {/* Group Row */}
                <div className="font-bold text-gray-500 text-left pt-1">Group</div>
                <div>
                  <input 
                    type="checkbox" 
                    checked={permGroup.read}
                    onChange={(e) => setPermGroup({ ...permGroup, read: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </div>
                <div>
                  <input 
                    type="checkbox" 
                    checked={permGroup.write}
                    onChange={(e) => setPermGroup({ ...permGroup, write: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </div>
                <div>
                  <input 
                    type="checkbox" 
                    checked={permGroup.execute}
                    onChange={(e) => setPermGroup({ ...permGroup, execute: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </div>

                {/* Other Row */}
                <div className="font-bold text-gray-500 text-left pt-1">Other</div>
                <div>
                  <input 
                    type="checkbox" 
                    checked={permOther.read}
                    onChange={(e) => setPermOther({ ...permOther, read: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </div>
                <div>
                  <input 
                    type="checkbox" 
                    checked={permOther.write}
                    onChange={(e) => setPermOther({ ...permOther, write: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </div>
                <div>
                  <input 
                    type="checkbox" 
                    checked={permOther.execute}
                    onChange={(e) => setPermOther({ ...permOther, execute: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPermsOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={chmodMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1"
                >
                  {chmodMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Apply</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 14. Delete Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Confirm Batch Deletion
              </h2>
              <button onClick={() => setIsDeleteOpen(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs font-bold text-red-700 flex items-start gap-2.5 leading-relaxed shadow-sm">
                <Lock className="w-5 h-5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="uppercase tracking-wider">Warning: Critical Action</p>
                  <p className="font-medium text-red-600 mt-0.5">This action is permanent and cannot be undone! The selected files and folders will be deleted permanently.</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Items to Delete ({selectedPaths.length})</p>
                <div className="max-h-28 overflow-y-auto bg-gray-50 border border-gray-100 p-2.5 rounded-lg text-xs text-gray-600 space-y-1 font-mono">
                  {selectedPaths.map(p => <div key={p} className="truncate">{p}</div>)}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 bg-white">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteMutation.mutate({
                      paths: selectedPaths
                    });
                  }}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 15. Premium Text Code Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 animate-in fade-in duration-200">
          <div className="bg-gray-900 border-b border-gray-800 px-6 py-4.5 flex items-center justify-between text-white select-none shadow-md">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-bold text-xs tracking-wider">{editingFile?.name}</h3>
                <p className="text-[9px] text-gray-500 font-mono tracking-widest mt-0.5">LOCATION: {editingFile?.path}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-xs">
              <span className="bg-gray-800 text-primary border border-gray-700 font-mono font-bold text-[9px] px-2.5 py-1 rounded-md uppercase tracking-widest">
                Syntax: {editingFile?.extension || "txt"}
              </span>
              <button
                onClick={() => {
                  if (editingFile) {
                    saveFileMutation.mutate({
                      path: editingFile.path,
                      content: fileContent
                    });
                  }
                }}
                disabled={saveFileMutation.isPending}
                className="bg-primary hover:bg-primary-hover disabled:bg-gray-800 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-1.5 transition-all"
              >
                {saveFileMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save</span>
              </button>
              <button
                onClick={() => { setIsEditorOpen(false); setEditingFile(null); setFileContent(""); }}
                className="text-gray-400 hover:text-white px-3 py-2 font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            {/* Simulation Line-Numbers */}
            <div className="bg-gray-900/50 text-gray-600 font-mono text-xs px-4 py-6 text-right select-none border-r border-gray-800/40 min-w-12 leading-relaxed">
              {Array(Math.max(1, fileContent.split("\n").length)).fill(0).map((_, i) => (
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
