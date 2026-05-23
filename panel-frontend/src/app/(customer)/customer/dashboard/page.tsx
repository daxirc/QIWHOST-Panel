"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CustomerAPI as API } from "@/lib/api";
import { getUser } from "@/lib/auth";
import {
  FolderOpen,
  Database,
  Mail,
  ShieldCheck,
  Save,
  Settings,
  Clock,
  HardDrive,
  Activity,
  Globe,
  ChevronRight,
  User,
  AlertTriangle,
} from "lucide-react";

export default function CustomerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  // Fetch customer dashboard metrics from API
  const { data: customerData, isLoading, error } = useQuery({
    queryKey: ["customer", "dashboard"],
    queryFn: async () => {
      const response = await API.get("/customer/dashboard");
      return response.data.data;
    },
  });

  const account = customerData?.account;
  const resources = customerData?.resources;

  // ProgressBar attributes mapper
  const getProgressBarProps = (percent: number) => {
    if (percent >= 100) {
      return {
        color: "bg-red-500",
        bg: "bg-red-50",
        border: "border-red-100",
        text: "text-red-600",
        warning: "Limit reached! Upgrade your plan",
      };
    } else if (percent >= 91) {
      return {
        color: "bg-red-500",
        bg: "bg-red-50",
        border: "border-red-100",
        text: "text-red-600",
        warning: "Approaching limit!",
      };
    } else if (percent >= 71) {
      return {
        color: "bg-yellow-500",
        bg: "bg-yellow-50",
        border: "border-yellow-100",
        text: "text-yellow-600",
        warning: "",
      };
    } else {
      return {
        color: "bg-green-500",
        bg: "bg-green-50/50",
        border: "border-green-100",
        text: "text-green-600",
        warning: "",
      };
    }
  };

  // Quick Action Utilities (2x3 or 3x2 Grid as requested)
  const quickActions = [
    {
      title: "File Manager",
      desc: "Browse, edit and manage source code directories",
      icon: FolderOpen,
      href: "/customer/file-manager",
      color: "bg-blue-50/50 text-blue-500 border-blue-100 hover:border-blue-200",
    },
    {
      title: "Databases",
      desc: "Manage MySQL database schemas and remote grants",
      icon: Database,
      href: "/customer/databases",
      color: "bg-green-50/50 text-green-500 border-green-100 hover:border-green-200",
    },
    {
      title: "Email",
      desc: "Provision mail boxes and routing maps",
      icon: Mail,
      href: "/customer/email",
      color: "bg-purple-50/50 text-purple-500 border-purple-100 hover:border-purple-200",
    },
    {
      title: "SSL Certificates",
      desc: "Install Let's Encrypt certificates automatically",
      icon: ShieldCheck,
      href: "/customer/ssl",
      color: "bg-orange-50/50 text-primary border-orange-100 hover:border-orange-200",
    },
    {
      title: "Backups",
      desc: "Configure standard cron archives and manual snapshots",
      icon: Save,
      href: "/customer/backups",
      color: "bg-emerald-50/50 text-emerald-600 border-emerald-100 hover:border-emerald-200",
    },
    {
      title: "Settings",
      desc: "Manage domain redirections, profiles, and limits",
      icon: Settings,
      href: "/customer/settings",
      color: "bg-gray-50/50 text-gray-600 border-gray-100 hover:border-gray-200",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-gray-100 rounded-md w-1/3"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-64 bg-gray-100 rounded-lg"></div>
          <div className="lg:col-span-2 h-64 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="h-32 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
          Welcome back, {user ? user.name : "Customer"}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor your allocated package limits and quickly access dashboard configurations.
        </p>
      </div>

      {/* Grid: Account overview and resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Account Overview Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col justify-between p-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-green-200 inline-block">
                {account?.status}
              </span>
              <span className="text-xs bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-orange-200 inline-block">
                {account?.package_name}
              </span>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Primary Domain</p>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight mt-1 truncate">
                {account?.domain}
              </h2>
            </div>

            <div className="space-y-2.5 pt-2 text-xs text-gray-500 font-medium border-t border-gray-100">
              <p className="flex justify-between">
                <span>SSH/SFTP Username:</span>
                <span className="text-gray-800 font-mono font-bold">{account?.username}</span>
              </p>
              <p className="flex justify-between">
                <span>IP Address:</span>
                <span className="text-gray-800 font-mono font-bold">{account?.ip_address}</span>
              </p>
              <p className="flex justify-between">
                <span>PHP Version:</span>
                <span className="text-gray-800 font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                  PHP {account?.php_version}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Member Since:</span>
                <span className="text-gray-800 font-semibold">
                  {new Date(account?.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </p>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-100 flex items-center space-x-2 text-xs text-gray-400 font-semibold mt-4">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>Expires on: {new Date(account?.expiry_date).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Resource Consumption Progress Bars (Allocated Resources Only) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary" />
              <span>Allocated Resource Consumption</span>
            </h3>
            <span className="text-xs text-gray-400 font-medium">package limits applied</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {/* Disk Space Progress Bar */}
            {resources?.disk && (() => {
              const props = getProgressBarProps(resources.disk.percent);
              return (
                <div className={`p-4 border rounded-lg ${props.bg} ${props.border} space-y-3`}>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-600 flex items-center space-x-1.5">
                      <HardDrive className="w-4 h-4 text-gray-400" />
                      <span>Disk Space</span>
                    </span>
                    <span className={props.text}>{resources.disk.percent}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-200/60 rounded-full overflow-hidden">
                    <div className={`h-full ${props.color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(resources.disk.percent, 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="text-gray-500">{resources.disk.label}</span>
                    {props.warning && (
                      <span className="flex items-center space-x-1 text-red-500 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{props.warning}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Bandwidth (Monthly) Progress Bar */}
            {resources?.bandwidth && (() => {
              const props = getProgressBarProps(resources.bandwidth.percent);
              return (
                <div className={`p-4 border rounded-lg ${props.bg} ${props.border} space-y-3`}>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-600 flex items-center space-x-1.5">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span>Bandwidth (Monthly)</span>
                    </span>
                    <span className={props.text}>{resources.bandwidth.percent}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-200/60 rounded-full overflow-hidden">
                    <div className={`h-full ${props.color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(resources.bandwidth.percent, 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="text-gray-500">{resources.bandwidth.label}</span>
                    {props.warning && (
                      <span className="flex items-center space-x-1 text-red-500 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{props.warning}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Addon Domains Progress Bar */}
            {resources?.domains && (() => {
              const percent = resources.domains.limit > 0 ? (resources.domains.used / resources.domains.limit) * 100 : 0;
              const props = getProgressBarProps(percent);
              return (
                <div className="p-4 border border-gray-100 rounded-lg space-y-3 bg-gray-50/30">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-600 flex items-center space-x-1.5">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span>Addon Domains</span>
                    </span>
                    <span className="text-gray-800">{resources.domains.label}</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-200/60 rounded-full overflow-hidden">
                    <div className={`h-full ${props.color} rounded-full`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                  </div>
                </div>
              );
            })()}

            {/* Email Accounts Progress Bar */}
            {resources?.emails && (() => {
              const percent = resources.emails.limit > 0 ? (resources.emails.used / resources.emails.limit) * 100 : 0;
              const props = getProgressBarProps(percent);
              return (
                <div className="p-4 border border-gray-100 rounded-lg space-y-3 bg-gray-50/30">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-600 flex items-center space-x-1.5">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>Email Accounts</span>
                    </span>
                    <span className="text-gray-800">{resources.emails.label}</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-200/60 rounded-full overflow-hidden">
                    <div className={`h-full ${props.color} rounded-full`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                  </div>
                </div>
              );
            })()}

            {/* Databases Progress Bar */}
            {resources?.databases && (() => {
              const percent = resources.databases.limit > 0 ? (resources.databases.used / resources.databases.limit) * 100 : 0;
              const props = getProgressBarProps(percent);
              return (
                <div className="p-4 border border-gray-100 rounded-lg space-y-3 bg-gray-50/30">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-600 flex items-center space-x-1.5">
                      <Database className="w-4 h-4 text-gray-400" />
                      <span>Databases</span>
                    </span>
                    <span className="text-gray-800">{resources.databases.label}</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-200/60 rounded-full overflow-hidden">
                    <div className={`h-full ${props.color} rounded-full`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                  </div>
                </div>
              );
            })()}

            {/* FTP Accounts Progress Bar */}
            {resources?.ftp_accounts && (() => {
              const percent = resources.ftp_accounts.limit > 0 ? (resources.ftp_accounts.used / resources.ftp_accounts.limit) * 100 : 0;
              const props = getProgressBarProps(percent);
              return (
                <div className="p-4 border border-gray-100 rounded-lg space-y-3 bg-gray-50/30">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-600 flex items-center space-x-1.5">
                      <FolderOpen className="w-4 h-4 text-gray-400" />
                      <span>FTP Accounts</span>
                    </span>
                    <span className="text-gray-800">{resources.ftp_accounts.label}</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-200/60 rounded-full overflow-hidden">
                    <div className={`h-full ${props.color} rounded-full`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </div>

      {/* Quick Launch Grid Section (2x3 or 3x2 Grid as requested) */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Quick Links Navigation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.title}
                onClick={() => router.push(tile.href)}
                className={`p-5 rounded-lg border text-left flex flex-col justify-between space-y-4 transition-all duration-300 bg-white shadow-sm hover:shadow-md group ${tile.color}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2.5 rounded-md bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                    <Icon className="w-5 h-5 animate-none group-hover:scale-105 transition-transform" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-850 group-hover:text-primary transition-colors text-sm">
                    {tile.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed mt-1">
                    {tile.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
