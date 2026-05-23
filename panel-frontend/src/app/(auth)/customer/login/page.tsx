"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { customerLogin, isCustomerAuthenticated } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

export default function CustomerLoginPage() {
  const router = useRouter();
  const refreshStore = useAuthStore((state) => state.refresh);

  // States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isCustomerAuthenticated()) {
      router.push("/customer/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await customerLogin(email, password);
      refreshStore(); // Reactive store update
      router.push("/customer/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.errors?.login?.[0] ||
        "Invalid customer email or password. Please try again."
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
          <h1 className="text-3xl font-extrabold tracking-wider text-teal-500">
            QIW <span className="text-white font-medium">HOST</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400 font-semibold tracking-wide">
            Customer Portal Login
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
              placeholder="customer@qiwhost.com"
              className="w-full text-sm text-white px-4 py-3 bg-[#0f172a] border border-gray-800 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
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
              className="w-full text-sm text-white px-4 py-3 bg-[#0f172a] border border-gray-800 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-650 text-white font-bold rounded-md flex items-center justify-center space-x-2 transition-all duration-200 mt-2 shadow-lg shadow-teal-500/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In to Customer Portal</span>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="pt-2 border-t border-gray-800 text-center text-xs">
          <span className="text-gray-500">Administrator? </span>
          <Link href="/login" className="text-teal-500 hover:underline font-bold">
            Login at /login
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-600">
        &copy; {new Date().getFullYear()} QIWHOST Hosting Panel. All rights reserved.
      </div>
    </div>
  );
}
