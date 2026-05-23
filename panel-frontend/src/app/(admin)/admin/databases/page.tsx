"use client";

import React, { useState, useEffect } from "react";
import { 
  Database as DbIcon, 
  Search, 
  Trash2, 
  Settings, 
  Wrench, 
  Users, 
  Check, 
  AlertCircle,
  Loader2,
  HardDrive
} from "lucide-react";
import { AdminAPI as API } from "@/lib/api";

interface DatabaseItem {
  id: number;
  database_name: string;
  database_name_prefix: string;
  connection_host: string;
  owner: string;
  domain: string;
  size_mb: number;
  user_count: number;
}

export default function AdminDatabases() {
  const [databases, setDatabases] = useState<DatabaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Slide-over states for user grants
  const [activeDb, setActiveDb] = useState<DatabaseItem | null>(null);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // New user form states inside slide-over
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  const fetchDatabases = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await API.get("/admin/databases");
      if (res.data.success) {
        setDatabases(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to retrieve system database registries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handleOptimize = async (dbId: number, dbName: string) => {
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await API.post(`/admin/databases/${dbId}/optimize`);
      if (res.data.success) {
        setSuccessMsg(`Database ${dbName} tables optimized successfully!`);
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Optimization script execution failed.");
    }
  };

  const handleRepair = async (dbId: number, dbName: string) => {
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await API.post(`/admin/databases/${dbId}/repair`);
      if (res.data.success) {
        setSuccessMsg(`Database ${dbName} tables checked and repaired successfully!`);
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Repair check execution failed.");
    }
  };

  const handleDeleteDb = async (dbId: number, dbName: string) => {
    if (!confirm(`Warning: Deleting ${dbName} drops all tables permanently! Proceed?`)) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await API.delete(`/admin/databases/${dbId}`);
      if (res.data.success) {
        setSuccessMsg(`Database ${dbName} dropped successfully.`);
        fetchDatabases();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete database.");
    }
  };

  // User Grants management inside slide-over
  const handleOpenUsers = async (db: DatabaseItem) => {
    setActiveDb(db);
    setLoadingUsers(true);
    setNewUsername("");
    setNewUserPassword("");
    try {
      const res = await API.get(`/admin/databases/${db.id}/users`);
      if (res.data.success) {
        setDbUsers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDb) return;
    setAddingUser(true);
    setErrorMsg("");
    try {
      const res = await API.post(`/admin/databases/${activeDb.id}/users`, {
        username: newUsername,
        password: newUserPassword
      });
      if (res.data.success) {
        setSuccessMsg("Database user added and permissions granted!");
        setNewUsername("");
        setNewUserPassword("");
        handleOpenUsers(activeDb);
        fetchDatabases();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to create database user.");
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!activeDb) return;
    if (!confirm("Revoke all privileges and drop this database user?")) return;
    setErrorMsg("");
    try {
      const res = await API.delete(`/admin/databases/${activeDb.id}/users/${userId}`);
      if (res.data.success) {
        setSuccessMsg("Database user privileges revoked successfully.");
        handleOpenUsers(activeDb);
        fetchDatabases();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to drop database user.");
    }
  };

  const filteredDatabases = databases.filter(db => 
    db.database_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <DbIcon className="w-7 h-7 text-primary" />
          Global Databases Manager
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor system SQL databases, view storage sizes, assign user credentials, and run table diagnostic repair or optimization tasks.
        </p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <Check className="w-5 h-5 text-green-600 bg-green-100 rounded-full p-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 bg-red-100 rounded-full p-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Control Row */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search databases or owners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
          />
        </div>
      </div>

      {/* Databases Datatable */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-gray-500">Querying MySQL servers metadata...</p>
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 font-semibold text-sm">
          No databases configured on this server yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Database Name</th>
                <th className="px-6 py-4">Account Owner</th>
                <th className="px-6 py-4">Storage Footprint</th>
                <th className="px-6 py-4">Connection Host</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-sm font-semibold">
              {filteredDatabases.map((db) => (
                <tr key={db.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-gray-850 font-bold">
                    <span className="text-gray-400 font-normal">{db.database_name_prefix}_</span>
                    <span>{db.database_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="text-gray-800 font-bold">{db.owner}</p>
                      <p className="text-[10px] text-gray-400">Username: {db.database_name_prefix}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-700 flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                    <span>{db.size_mb} MB</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{db.connection_host}</td>
                  <td className="px-6 py-4 text-right space-x-1.5">
                    <button
                      onClick={() => handleOpenUsers(db)}
                      className="text-gray-600 hover:text-primary p-2 hover:bg-gray-100 rounded-lg transition-all"
                      title="Manage Users"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOptimize(db.id, db.database_name_prefix + "_" + db.database_name)}
                      className="text-gray-600 hover:text-primary p-2 hover:bg-gray-100 rounded-lg transition-all"
                      title="Optimize Tables"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRepair(db.id, db.database_name_prefix + "_" + db.database_name)}
                      className="text-gray-600 hover:text-primary p-2 hover:bg-gray-100 rounded-lg transition-all"
                      title="Repair Tables"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDb(db.id, db.database_name_prefix + "_" + db.database_name)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all"
                      title="Drop Database"
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

      {/* Users slide-over panel */}
      {activeDb && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-white max-w-lg w-full h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto select-text">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-150">
                <h3 className="text-sm font-bold text-gray-800">
                  Manage Users: <span className="text-primary">{activeDb.database_name_prefix}_{activeDb.database_name}</span>
                </h3>
                <button
                  onClick={() => setActiveDb(null)}
                  className="text-gray-400 hover:text-gray-700 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Add database User form */}
              <form onSubmit={handleAddUser} className="py-6 space-y-4 text-xs font-bold text-gray-500 border-b border-gray-150">
                <h4 className="text-gray-800 uppercase tracking-wider font-extrabold">Grant New User Access</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="uppercase">DB Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm select-none">
                        {activeDb.database_name_prefix}_
                      </span>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-14 pr-3 py-2 text-sm focus:outline-none text-gray-800 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="uppercase">Password</label>
                    <input
                      type="password"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md cursor-pointer"
                  >
                    {addingUser ? "Adding..." : "Grant Access"}
                  </button>
                </div>
              </form>

              {/* Users list with privileges */}
              <div className="pt-6 space-y-4">
                <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Authorized Users</h4>
                {loadingUsers ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                ) : dbUsers.length === 0 ? (
                  <p className="text-xs text-gray-400 font-semibold italic">No users have been granted access to this database.</p>
                ) : (
                  <div className="border border-gray-150 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 font-bold text-gray-500 uppercase">
                          <th className="px-4 py-2.5">User name</th>
                          <th className="px-4 py-2.5">Host</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 font-semibold text-gray-700">
                        {dbUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="px-4 py-2.5 font-bold text-gray-850">
                              {activeDb.database_name_prefix}_{user.username}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-gray-550">{user.host}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => handleRemoveUser(user.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-50"
                                title="Revoke Privileges"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}
    </div>
  );
}
