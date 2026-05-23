"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import QueryProvider from "@/providers/QueryProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("qiw_admin_token");
    if (!token) { 
      router.replace("/login"); 
    } else { 
      setAuthorized(true); 
    }
  }, [router]);

  if (!mounted) return null;
  if (!authorized) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#f1f5f9]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
    </div>
  );

  return (
    <QueryProvider>
      <div className="min-h-screen bg-[#f1f5f9] flex">
        <Sidebar role="admin" />
        <div className="flex-1 flex flex-col pl-[260px]">
          <Header />
          <main className="flex-1 pt-24 px-8 pb-12 overflow-y-auto">{children}</main>
        </div>
      </div>
    </QueryProvider>
  );
}
