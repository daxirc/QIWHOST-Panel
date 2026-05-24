"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SsoRedirectInner() {
    const params = useSearchParams();

    useEffect(() => {
        const token = params.get("token");
        if (token) {
            // Determine backend API host and port dynamically
            const apiHost = typeof window !== "undefined" ? window.location.hostname : "";
            // Default backend API port is 8080
            const backendSsoUrl = `http://${apiHost}:8080/sso?token=${token}`;
            window.location.href = backendSsoUrl;
        } else {
            window.location.href = "/customer/login";
        }
    }, [params]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#0f172a]">
            <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Authenticating Single Sign-On...</p>
            </div>
        </div>
    );
}

export default function SsoRedirectPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-[#0f172a]">
                <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading SSO connection...</p>
                </div>
            </div>
        }>
            <SsoRedirectInner />
        </Suspense>
    );
}
