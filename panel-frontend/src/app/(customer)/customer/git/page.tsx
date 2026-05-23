"use client";

import React from "react";
import { GitBranch, Terminal, GitPullRequest, Key, Sparkles, CheckCircle2 } from "lucide-react";

export default function CustomerGit() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <GitBranch className="w-7 h-7 text-primary" />
          Git Deployments
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Deploy and host web projects directly from GitHub, GitLab, or custom git remotes with automated hooks.
        </p>
      </div>

      {/* Showcase layout */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-850 border border-gray-800 rounded-xl p-6 text-white relative overflow-hidden shadow-lg max-w-3xl">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <GitBranch className="w-48 h-48" />
        </div>
        
        <div className="space-y-4 max-w-xl relative z-10">
          <span className="bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>CI/CD Pipelines coming soon</span>
          </span>

          <h2 className="text-xl font-extrabold tracking-tight">
            Automate code sync directly into public_html
          </h2>
          
          <p className="text-xs text-gray-300 leading-relaxed font-semibold">
            In the upcoming release, you will be able to link your code repository. When you run `git push origin main`, our server automatically runs your custom build script and deploys the changes to your LiteSpeed virtual host context!
          </p>

          <div className="pt-2 flex flex-wrap gap-3 text-[10px] font-bold text-gray-400">
            <span className="bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span>SSH Keys Binding</span>
            </span>
            <span className="bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
              <GitPullRequest className="w-3.5 h-3.5 text-primary" />
              <span>Webhook Redeploys</span>
            </span>
          </div>
        </div>
      </div>

      {/* Feature cards preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-gray-850 flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            Jailed Deployments
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            Deployments are jailed strictly within your `/home/{username}/public_html` shell namespace, preventing any cross-tenant read risks.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-gray-850 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Multi-branch sandboxes
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            Deploy your `production` branch on your primary domain and your `development` branches on subdomains to test pull requests instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
