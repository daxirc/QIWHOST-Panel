"use client";

import React from "react";
import { GitBranch, GitPullRequest, GitMerge, Terminal, Code, Sparkles } from "lucide-react";

export default function AdminGit() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <GitBranch className="w-7 h-7 text-primary" />
          Git & Version Control Integration
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Deploy web applications instantly from public and private Git repositories with automated webhook redeployments.
        </p>
      </div>

      {/* Hero Showcase coming soon */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-850 border border-gray-800 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <GitBranch className="w-64 h-64" />
        </div>
        
        <div className="max-w-xl space-y-6 relative z-10">
          <span className="bg-primary/20 border border-primary/30 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Developer Feature Preview</span>
          </span>

          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
            Seamless Git Deployments & Webhook Rollouts
          </h2>
          
          <p className="text-sm text-gray-300 leading-relaxed">
            Link GitHub, GitLab, and custom Git providers to automate repository pulls directly into user document roots.
            Our containerized daemon will monitor branch commits, build modern static assets, and restart the OpenLiteSpeed virtual host contexts automatically.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-4">
            <span className="flex items-center gap-1.5 text-gray-400 bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
              <Code className="w-4 h-4 text-primary" />
              <span>CI/CD Webhooks</span>
            </span>
            <span className="flex items-center gap-1.5 text-gray-400 bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
              <GitPullRequest className="w-4 h-4 text-primary" />
              <span>SSH Keys Gen</span>
            </span>
            <span className="flex items-center gap-1.5 text-gray-400 bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
              <Terminal className="w-4 h-4 text-primary" />
              <span>Build Pipeline Scripts</span>
            </span>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-xl w-fit">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">Private Repositories Support</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            Generate and assign highly secure SSH keypairs per hosting account. Connect to private GitHub repositories safely without sharing user passwords.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="p-3 bg-purple-50 text-purple-500 rounded-xl w-fit">
            <Terminal className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">Custom Build Scripts</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            Run automated commands post-pull such as `npm install && npm run build` or `composer install` inside user jail environments to provision dependencies.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="p-3 bg-green-50 text-green-500 rounded-xl w-fit">
            <GitMerge className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">Branch Tracking</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            Deploy separate branches (e.g. `main` vs `staging`) directly onto distinct subdomains to run fully functional dev sandboxes.
          </p>
        </div>
      </div>
    </div>
  );
}
