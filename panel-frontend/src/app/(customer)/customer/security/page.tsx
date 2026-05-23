"use client";

import React, { useState, useEffect } from "react";
import { KeyRound, ShieldAlert, Trash2, Check, AlertCircle, Loader2, Globe, Activity } from "lucide-react";
import { CustomerAPI as API } from "@/lib/api";

interface SessionToken {
  id: number;
  name: string;
  last_used_at: string | null;
  created_at: string;
  ip_address: string;
}

export default function CustomerSecurity() {
  const [sessions, setSessions] = useState<SessionToken[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Form states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await API.get("/customer/sessions");
      if (res.data.success) {
        setSessions(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load session tokens:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (newPassword !== newPasswordConfirmation) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await API.post("/customer/profile/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation
      });
      if (res.data.success) {
        setSuccessMsg("Password changed successfully!");
        setOldPassword("");
        setNewPassword("");
        setNewPasswordConfirmation("");
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to update profile password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleRevokeSession = async (tokenId: number) => {
    if (!confirm("Are you sure you want to revoke this session? You will be logged out if this is your active session token.")) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await API.delete(`/customer/sessions/${tokenId}`);
      if (res.data.success) {
        setSuccessMsg("Session token revoked successfully.");
        fetchSessions();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to revoke session token.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <KeyRound className="w-7 h-7 text-primary" />
          Security & Access Controls
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account passwords, API access credentials, and revoke active login tokens securely.
        </p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm max-w-3xl">
          <Check className="w-5 h-5 text-green-600 bg-green-100 rounded-full p-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-center gap-2 shadow-sm max-w-3xl">
          <AlertCircle className="w-5 h-5 text-red-600 bg-red-100 rounded-full p-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
        
        {/* Change Password Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            Update Portal Password
          </h3>
          
          <form onSubmit={handleChangePassword} className="space-y-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase block">Current Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase block">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase block">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={newPasswordConfirmation}
                  onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={updatingPassword}
                className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                {updatingPassword ? "Changing..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>

        {/* Info card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Security Instructions
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            Choose passwords of at least 8 characters with dynamic mixes of uppercase, lowercase, digits, and special indicators to guarantee containment.
          </p>
          <p className="text-xs text-gray-400 font-medium">
            SSH and FTP credentials utilize the primary container username, which is managed directly via jail-level OS passwords.
          </p>
        </div>
      </div>

      {/* Login Sessions Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 max-w-5xl space-y-4">
        <h3 className="text-sm font-bold text-gray-850 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Active Login Sessions & Personal Access Tokens
        </h3>
        
        {loadingSessions ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs font-semibold text-gray-400">Loading access sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-gray-400 font-semibold italic">No active session tokens found.</p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Token Descriptor</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Issued On</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-semibold text-gray-800">
                {sessions.map((token) => (
                  <tr key={token.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-850 font-bold">{token.name}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-600">{token.ip_address}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(token.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : "Active Now"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevokeSession(token.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                        title="Revoke and Logout Session"
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
  );
}
