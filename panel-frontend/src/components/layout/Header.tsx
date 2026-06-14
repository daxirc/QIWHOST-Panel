"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, User as UserIcon, LogOut, ChevronDown, X, CheckCircle2, ShieldCheck, Server, HardDrive, Clock } from "lucide-react";
import { adminLogout, customerLogout, getUser, getUserRole } from "@/lib/auth";

interface Notification {
  id: string;
  icon: React.ReactNode;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "success" | "info" | "warning";
}

export default function Header() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getUser());
    setRole(getUserRole());

    // Generate system status notifications
    const systemNotifs: Notification[] = [
      {
        id: "sys-1",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        title: "All Systems Operational",
        message: "Web server, database, mail, and DNS services are running normally.",
        time: "Just now",
        read: false,
        type: "success",
      },
      {
        id: "sys-2",
        icon: <ShieldCheck className="w-4 h-4 text-blue-500" />,
        title: "SSL Certificates Active",
        message: "All SSL certificates are valid and auto-renewal is configured.",
        time: "Today",
        read: false,
        type: "info",
      },
      {
        id: "sys-3",
        icon: <Server className="w-4 h-4 text-violet-500" />,
        title: "DNS Server Online",
        message: "BIND9 authoritative DNS is active and serving zones.",
        time: "Today",
        read: true,
        type: "info",
      },
      {
        id: "sys-4",
        icon: <HardDrive className="w-4 h-4 text-amber-500" />,
        title: "DKIM Signing Active",
        message: "OpenDKIM is configured and signing outgoing emails.",
        time: "Today",
        read: true,
        type: "success",
      },
    ];
    setNotifications(systemNotifs);
    setUnreadCount(systemNotifs.filter((n) => !n.read).length);
  }, []);

  // Close notification panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  const handleLogout = () => {
    if (role === "admin") {
      adminLogout();
    } else {
      customerLogout();
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const dismissNotification = (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (notif && !notif.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-[260px] z-20 flex items-center justify-between px-8 shadow-sm">
      {/* Search Input Stub */}
      <div className="relative w-72">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder="Search services, domains, accounts..."
          className="w-full text-sm pl-9 pr-4 py-2 border border-gray-300 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200"
        />
      </div>

      {/* Action Bars */}
      <div className="flex items-center space-x-6">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors duration-200"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2.5 w-[380px] bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden"
              style={{ animation: "fadeInDown 0.15s ease-out" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No notifications</p>
                    <p className="text-xs text-gray-400 mt-1">You&apos;re all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`group flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 last:border-0 transition-colors duration-150 ${
                        notif.read ? "bg-white hover:bg-gray-50" : "bg-primary/[0.03] hover:bg-primary/[0.06]"
                      }`}
                    >
                      {/* Icon */}
                      <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        notif.type === "success" ? "bg-emerald-50" :
                        notif.type === "warning" ? "bg-amber-50" : "bg-blue-50"
                      }`}>
                        {notif.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-tight ${notif.read ? "text-gray-700" : "text-gray-900 font-semibold"}`}>
                            {notif.title}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 transition-all duration-150"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-[11px] text-gray-400">{notif.time}</span>
                          {!notif.read && (
                            <span className="ml-1 w-1.5 h-1.5 bg-primary rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 text-center">
                  <button
                    onClick={() => { setNotifications([]); setUnreadCount(0); }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                  >
                    Clear all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 text-left focus:outline-none py-1 px-2 rounded-md hover:bg-gray-50 transition-colors duration-200 select-none"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              {user ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {user ? user.name : "Session User"}
              </p>
              <p className="text-xs font-medium text-gray-400 capitalize">
                {role ? `${role} account` : "Loading..."}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* Dropdown Card */}
          {dropdownOpen && (
            <>
              <div
                onClick={() => setDropdownOpen(false)}
                className="fixed inset-0 z-30"
              />
              <div className="absolute right-0 mt-2.5 w-56 bg-white rounded-md border border-gray-200 shadow-lg py-1 z-40 animate-in fade-in duration-100">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {user ? user.email : "user@qiwhost.com"}
                  </p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
