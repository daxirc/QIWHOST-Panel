"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminLogin, isAdminAuthenticated } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const refreshStore = useAuthStore((state) => state.refresh);

  // States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAdminAuthenticated()) {
      router.push("/admin/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await adminLogin(email, password);
      refreshStore(); // Reactive store update
      router.push("/admin/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        err.response?.data?.errors?.email?.[0] ||
        "Invalid admin email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-4 py-12 select-none">
      {/* Container Card */}
      <div className="w-full max-w-md bg-[#1e293b] rounded-xl shadow-2xl border border-gray-800 p-8 space-y-6">
        
        {/* Head Branding */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-wider text-primary">
            QIW <span className="text-white font-medium">HOST</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400 font-semibold tracking-wide">
            Administrator Login
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium px-4 py-2.5 rounded-md text-center">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@qiwhost.com"
              className="w-full text-sm text-white px-4 py-3 bg-[#0f172a] border border-gray-800 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full text-sm text-white px-4 py-3 bg-[#0f172a] border border-gray-800 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold rounded-md flex items-center justify-center space-x-2 transition-all duration-200 mt-2 shadow-lg shadow-primary/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In to Admin Panel</span>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="pt-2 border-t border-gray-800 text-center text-xs">
          <span className="text-gray-500">Customer? </span>
          <Link href="/customer/login" className="text-primary hover:underline font-bold">
            Login at /customer/login
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-600">
        &copy; {new Date().getFullYear()} QIWHOST Hosting Panel. All rights reserved.
      </div>
    </div>
  );
}
