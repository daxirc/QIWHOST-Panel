"use client";

import React, { useState, useEffect } from "react";
import { Mail, ExternalLink, Inbox, Loader2, Globe, ShieldCheck } from "lucide-react";
import { CustomerAPI as API } from "@/lib/api";

interface EmailAccount {
  id: number;
  email: string;
  login: string;
  quota_mb: number;
}

export default function CustomerWebmail() {
  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = async () => {
    try {
      const res = await API.get("/customer/emails");
      if (res.data.success) {
        setEmails(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch customer mailboxes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <Mail className="w-7 h-7 text-primary" />
          Roundcube Webmail Gateway
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Access your professional email boxes using the dynamic secure Roundcube web client.
        </p>
      </div>

      {/* Main Redirect Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-3xl">
        <div className="space-y-2 max-w-lg">
          <div className="flex items-center space-x-3 text-primary">
            <Inbox className="w-6 h-6" />
            <h3 className="text-base font-bold text-gray-800">Direct Webmail client</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            Log in with your full email address and its mailbox password. The server automatically routes IMAP requests via Dovecot processes.
          </p>
        </div>
        <div>
          <a
            href={typeof window !== "undefined" ? "http://" + window.location.hostname + "/webmail" : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md inline-flex items-center gap-1.5 transition-all w-full md:w-auto"
          >
            <span>Open Roundcube client</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Mailbox lists */}
      <div className="space-y-4 max-w-3xl">
        <h3 className="text-sm font-bold text-gray-850">Your Active Mailboxes</h3>
        
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-gray-500">Querying active virtual mailboxes...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 font-semibold text-sm">
            You haven't created any email accounts yet. Create one under the "Email Accounts" section.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Quota Limit</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-semibold text-sm">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-850 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <span>{email.email}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {email.quota_mb === 0 || !email.quota_mb ? "Unlimited" : `${email.quota_mb} MB`}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={typeof window !== "undefined" ? "http://" + window.location.hostname + "/webmail" : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs font-bold flex items-center justify-end gap-1"
                      >
                        <span>Access Box</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
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
