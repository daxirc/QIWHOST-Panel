"use client";

import React, { useEffect } from "react";
import { Mail, Loader2 } from "lucide-react";

export default function WebmailRedirect() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Direct browser window redirect to the OLS port 80 endpoint
      window.location.href = `http://${window.location.hostname}/webmail`;
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
      
      {/* Elegant glassmorphic container with micro-animations */}
      <div className="relative bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-center animate-in fade-in zoom-in-95 duration-500 ease-out">
        {/* Animated icon container */}
        <div className="relative w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
          <Mail className="w-8 h-8 text-white animate-pulse" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-indigo-100 to-purple-200">
          Accessing Webmail
        </h2>
        
        {/* Subtitle */}
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Routing your connection securely via OpenLiteSpeed Webmail gateway...
        </p>

        {/* Circular loader */}
        <div className="mt-8 flex justify-center">
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <div className="absolute w-12 h-12 border-2 border-indigo-500/10 border-t-indigo-500/30 rounded-full animate-ping pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
