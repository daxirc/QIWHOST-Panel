"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, User as UserIcon, LogOut, ChevronDown } from "lucide-react";
import { adminLogout, customerLogout, getUser, getUserRole } from "@/lib/auth";

export default function Header() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setRole(getUserRole());
  }, []);

  const handleLogout = () => {
    if (role === "admin") {
      adminLogout();
    } else {
      customerLogout();
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
        {/* Notifications Icon Stub */}
        <button className="relative p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-white"></span>
        </button>

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
    </header>
  );
}
