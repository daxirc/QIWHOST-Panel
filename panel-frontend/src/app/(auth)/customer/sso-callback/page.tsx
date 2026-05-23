"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SsoCallbackInner() {
    const router = useRouter();
    const params = useSearchParams();

    useEffect(() => {
        const token = params.get("token");
        const email = params.get("email");

        if (token && email) {
            // Store customer token
            localStorage.setItem("qiw_customer_token", token);
            localStorage.setItem("qiw_customer_user", JSON.stringify({ email }));
            localStorage.setItem("qiw_user_role", "customer");
            
            // Redirect to dashboard
            router.replace("/customer/dashboard");
        } else {
            router.replace("/customer/login");
        }
    }, [params, router]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#0f172a]">
            <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Logging you in...</p>
            </div>
        </div>
    );
}

export default function SsoCallbackPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-[#0f172a]">
                <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading SSO connection...</p>
                </div>
            </div>
        }>
            <SsoCallbackInner />
        </Suspense>
    );
}
