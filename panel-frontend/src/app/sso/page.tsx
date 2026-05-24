"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SsoRedirectInner() {
    const params = useSearchParams();

    useEffect(() => {
        const token = params.get("token");
        if (token) {
            // Use relative /backend path so Next.js rewrites handle it
            const backendSsoUrl = `/backend/sso?token=${token}`;
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
