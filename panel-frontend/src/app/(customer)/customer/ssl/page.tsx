"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Search,
  Sparkles,
  CheckCircle,
  XCircle,
  Calendar,
  Zap,
  Globe
} from "lucide-react";

export default function CustomerSsl() {
  const queryClient = useQueryClient();
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [domainId, setDomainId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Polling states
  const [provisioningJobId, setProvisioningJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<any>(null);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  // Fetch client domains to check security status
  const { data: domainsRes, isLoading } = useQuery({
    queryKey: ["customer", "domains"],
    queryFn: async () => {
      const res = await API.get("/customer/domains");
      return res.data.data;
    }
  });

  const domains = Array.isArray(domainsRes) ? domainsRes : [];

  // Install SSL Mutation
  const installMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.post(`/customer/ssl/${id}/provision`);
      return res.data;
    },
    onSuccess: (data) => {
      setProvisioningJobId(data.job_id);
      setJobProgress({ status: "pending", step: 0, message: "Scheduling SSL installation..." });
      setIsInstallOpen(false);
      setIsProgressOpen(true);
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to initiate SSL provisioning. Verify DNS resolution.");
    }
  });

  // Polling effect
  useEffect(() => {
    if (!provisioningJobId) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await API.get(`/customer/ssl/poll/${provisioningJobId}`);
        if (res.data.success) {
          const progress = res.data.data;
          setJobProgress(progress);

          if (progress.status === "done" || progress.status === "failed") {
            clearInterval(intervalId);
            queryClient.invalidateQueries({ queryKey: ["customer", "domains"] });
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [provisioningJobId, queryClient]);

  const handleInstallSsl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainId) {
      setErrorMsg("Please select a domain.");
      return;
    }
    installMutation.mutate(parseInt(domainId));
  };

  const steps = [
    { number: 1, label: "Verifying domain DNS" },
    { number: 2, label: "Requesting Let's Encrypt certificate" },
    { number: 3, label: "Installing certificate" },
    { number: 4, label: "Configuring OpenLiteSpeed" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary animate-pulse" />
            Let's Encrypt SSL Certificates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Provision zero-downtime Let's Encrypt keys, secure addon domains, and auto-renew TLS encryption profiles.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg("");
            setIsInstallOpen(true);
          }}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Provision Certificate</span>
        </button>
      </div>

      {/* Main Domains Security List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse font-semibold">Loading domains...</div>
        ) : domains.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Globe className="w-12 h-12 mx-auto text-gray-200" />
            <p className="font-semibold text-gray-500">No active domains found</p>
            <p className="text-xs">Configure custom domains first to enable SSL provisioning.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Domain Name</th>
                  <th className="px-6 py-4">Security Provider</th>
                  <th className="px-6 py-4 text-center">Type</th>
                  <th className="px-6 py-4 text-center">Auto Renew</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {domains.map((dom: any) => (
                  <tr key={dom.id} className="hover:bg-gray-50/50 transition-colors font-semibold">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span>{dom.domain}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">
                      {dom.is_secure_with_ssl ? "Let's Encrypt CA" : <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200`}>
                        {dom.is_main ? "Primary" : "Addon"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {dom.is_secure_with_ssl ? (
                        <span className="text-green-600 font-bold text-xs uppercase flex items-center justify-center gap-1">
                          <Zap className="w-3 h-3 animate-bounce" />
                          Auto Active
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {dom.is_secure_with_ssl ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Active HTTPS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Insecure</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!dom.is_secure_with_ssl ? (
                        <button
                          onClick={() => {
                            setErrorMsg("");
                            installMutation.mutate(dom.id);
                          }}
                          className="bg-primary hover:bg-primary-hover text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow transition-colors"
                        >
                          Enable SSL
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Certificate Modal */}
      {isInstallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Issue Let's Encrypt Certificate
              </h2>
              <button 
                onClick={() => { setIsInstallOpen(false); setErrorMsg(""); }}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleInstallSsl} className="p-6 space-y-4 font-semibold text-sm">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Select Domain to Encrypt
                </label>
                <select
                  value={domainId}
                  onChange={(e) => setDomainId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-semibold"
                  required
                >
                  <option value="">-- Choose Domain --</option>
                  {domains.filter(d => !d.is_secure_with_ssl).map((dom: any) => (
                    <option key={dom.id} value={dom.id}>
                      {dom.domain} ({dom.is_main ? "Primary" : "Addon"})
                    </option>
                  ))}
                  {domains.filter(d => !d.is_secure_with_ssl).length === 0 && (
                    <option disabled>All domains secured!</option>
                  )}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsInstallOpen(false); setErrorMsg(""); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={installMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm shadow-md flex items-center gap-2 transition-all font-bold"
                >
                  {installMutation.isPending ? "Issuing TLS Key..." : "Provision SSL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SSL Installation Real-time Progress Modal */}
      {isProgressOpen && jobProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Let's Encrypt Installer Progress
              </h2>
              {(jobProgress.status === "done" || jobProgress.status === "failed") && (
                <button 
                  onClick={() => { setIsProgressOpen(false); setProvisioningJobId(null); setJobProgress(null); }}
                  className="text-gray-400 hover:text-gray-600 font-semibold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="p-6 space-y-6 text-sm font-semibold">
              {/* Progress Steps */}
              <div className="space-y-4">
                {steps.map((step) => {
                  const isCompleted = jobProgress.step > step.number || jobProgress.status === "done";
                  const isCurrent = jobProgress.step === step.number && jobProgress.status === "processing";
                  const isPending = jobProgress.step < step.number && jobProgress.status !== "done";
                  const isStepFailed = jobProgress.step === step.number && jobProgress.status === "failed";

                  return (
                    <div key={step.number} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted ? "bg-green-100 text-green-700" :
                          isCurrent ? "bg-primary/20 text-primary animate-pulse" :
                          isStepFailed ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-400"
                        }`}>
                          {step.number}
                        </span>
                        <span className={`${
                          isCompleted ? "text-green-700 font-semibold" :
                          isCurrent ? "text-primary font-bold" :
                          isStepFailed ? "text-red-700 font-bold" :
                          "text-gray-400"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      <div>
                        {isCompleted && <span className="text-green-600">✅</span>}
                        {isCurrent && <span className="text-primary animate-spin inline-block font-bold">⏳</span>}
                        {isStepFailed && <span className="text-red-600">❌</span>}
                        {isPending && <span className="text-gray-300">⚪</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center space-y-2 ${
                jobProgress.status === "done" ? "bg-green-50 border-green-200 text-green-800" :
                jobProgress.status === "failed" ? "bg-red-50 border-red-200 text-red-800" :
                "bg-gray-50 border-gray-100 text-gray-600"
              }`}>
                {jobProgress.status === "processing" || jobProgress.status === "pending" ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin inline-block"></span>
                    <span className="font-bold">{jobProgress.message}</span>
                  </div>
                ) : jobProgress.status === "done" ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-2xl">🎉</span>
                    <span className="font-bold text-base">Provision Success!</span>
                    <p className="text-xs text-green-600 mt-1">{jobProgress.message}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-2xl">⚠️</span>
                    <span className="font-bold text-red-700">Provision Failed!</span>
                    <p className="text-xs text-red-600 font-mono mt-1 text-left bg-white p-3 rounded-lg border border-red-100 max-h-32 overflow-y-auto">
                      {jobProgress.error || "Unknown error occurred during DNS pointing or certbot validation."}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {(jobProgress.status === "done" || jobProgress.status === "failed") && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setIsProgressOpen(false);
                      setProvisioningJobId(null);
                      setJobProgress(null);
                    }}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-colors ${
                      jobProgress.status === "done"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-gray-700 hover:bg-gray-800 text-white"
                    }`}
                  >
                    Close Wizard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
