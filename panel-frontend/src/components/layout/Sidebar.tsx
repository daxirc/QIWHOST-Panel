"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Layers,
  Package,
  Globe,
  Mail,
  Database as DbIcon,
  FolderOpen,
  Clock,
  Save,
  Activity,
  Settings,
  ShieldCheck,
  Lock,
  Cpu,
  MailOpen,
  GitBranch,
  Network,
} from "lucide-react";

interface SidebarProps {
  role: "admin" | "customer";
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  // Define section layouts dynamically based on role
  const adminSections: MenuSection[] = [
    {
      title: "MAIN",
      items: [
        { name: "Dashboard", href: "/admin/dashboard", icon: Home },
      ],
    },
    {
      title: "HOSTING",
      items: [
        { name: "Customers", href: "/admin/customers", icon: Users },
        { name: "Hosting Accounts", href: "/admin/hosting-accounts", icon: Layers },
        { name: "Packages", href: "/admin/packages", icon: Package },
      ],
    },
    {
      title: "SERVICES",
      items: [
        { name: "Domains", href: "/admin/domains", icon: Globe },
        { name: "DNS Manager", href: "/admin/dns", icon: Network },
        { name: "Email", href: "/admin/email", icon: Mail },
        { name: "Webmail", href: "/admin/webmail", icon: MailOpen },
        { name: "Databases", href: "/admin/databases", icon: DbIcon },
        { name: "PHP Manager", href: "/admin/php-manager", icon: Cpu },
        { name: "Node.js", href: "/admin/nodejs", icon: Cpu },
        { name: "Git/Version Control", href: "/admin/git", icon: GitBranch },
        { name: "File Manager", href: "/admin/file-manager", icon: FolderOpen },
        { name: "SSL Certificates", href: "/admin/ssl", icon: ShieldCheck },
        { name: "WordPress", href: "/admin/wordpress", icon: Globe },
        { name: "Cron Jobs", href: "/admin/cron-jobs", icon: Clock },
        { name: "Backups", href: "/admin/backups", icon: Save },
      ],
    },
    {
      title: "SERVER",
      items: [
        { name: "Server Status", href: "/admin/server-status", icon: Activity },
        { name: "Security", href: "/admin/security", icon: Lock },
        { name: "Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

  const customerSections: MenuSection[] = [
    {
      title: "MAIN",
      items: [
        { name: "Dashboard", href: "/customer/dashboard", icon: Home },
      ],
    },
    {
      title: "SERVICES",
      items: [
        { name: "Domains", href: "/customer/domains", icon: Globe },
        { name: "DNS Manager", href: "/customer/dns", icon: Network },
        { name: "Email", href: "/customer/email", icon: Mail },
        { name: "Webmail", href: "/customer/webmail", icon: MailOpen },
        { name: "Databases", href: "/customer/databases", icon: DbIcon },
        { name: "PHP Manager", href: "/customer/php-manager", icon: Cpu },
        { name: "Node.js Apps", href: "/customer/nodejs", icon: Cpu },
        { name: "Git/Version Control", href: "/customer/git", icon: GitBranch },
        { name: "File Manager", href: "/customer/file-manager", icon: FolderOpen },
        { name: "SSL Certificates", href: "/customer/ssl", icon: ShieldCheck },
        { name: "WordPress", href: "/customer/wordpress", icon: Globe },
        { name: "Cron Jobs", href: "/customer/cron-jobs", icon: Clock },
        { name: "Backups", href: "/customer/backups", icon: Save },
      ],
    },
    {
      title: "SERVER",
      items: [
        { name: "Security", href: "/customer/security", icon: Lock },
        { name: "Settings", href: "/customer/settings", icon: Settings },
      ],
    },
  ];

  const sections = role === "admin" ? adminSections : customerSections;

  return (
    <aside className="w-[260px] bg-sidebar text-gray-300 h-screen fixed top-0 left-0 flex flex-col z-30 shadow-xl select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <Link href={`/${role}/dashboard`} className="flex items-center space-x-2">
          <span className="text-primary text-xl font-bold tracking-wider">QIW</span>
          <span className="text-white text-lg font-medium tracking-wide">HOST PANEL</span>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7 scrollbar-thin scrollbar-thumb-gray-800">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <span className="px-3 text-xs font-bold text-gray-500 tracking-widest uppercase block">
              {section.title}
            </span>
            <nav className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? "bg-primary text-white font-semibold shadow-md"
                        : "hover:bg-white/5 hover:text-white text-gray-400"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isActive
                          ? "text-white"
                          : "text-gray-400 group-hover:text-white"
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-800 bg-black/10 flex items-center justify-between text-xs text-gray-500">
        <span>v1.0.0</span>
        <span className="capitalize">{role} Portal</span>
      </div>
    </aside>
  );
}
