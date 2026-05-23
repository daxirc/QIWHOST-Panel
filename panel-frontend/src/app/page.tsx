"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const adminToken = localStorage.getItem("qiw_admin_token");
      const customerToken = localStorage.getItem("qiw_customer_token");

      if (adminToken) {
        router.push("/admin/dashboard");
      } else if (customerToken) {
        router.push("/customer/dashboard");
      } else {
        router.push("/customer/login");
      }
    }
  }, [router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0f172a]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  );
}
