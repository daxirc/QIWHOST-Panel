"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAPI as API } from "@/lib/api";
import { 
  Clock, 
  Plus, 
  Trash2, 
  Search,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Terminal
} from "lucide-react";

export default function CustomerCronJobs() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Form State
  const [command, setCommand] = useState("");
  const [schedule, setSchedule] = useState("* * * * *");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch crontabs
  const { data: cronsRes, isLoading } = useQuery({
    queryKey: ["customer", "cron-jobs"],
    queryFn: async () => {
      const res = await API.get("/customer/cron-jobs");
      return res.data.data;
    }
  });

  const cronJobs = Array.isArray(cronsRes) ? cronsRes : [];

  // Create Cron Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await API.post("/customer/cron-jobs", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "cron-jobs"] });
      setIsAddOpen(false);
      setCommand("");
      setSchedule("* * * * *");
      setDescription("");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || "Failed to create cron job schedule.");
    }
  });

  // Toggle active/disabled mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number, payload: any }) => {
      const res = await API.put(`/customer/cron-jobs/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "cron-jobs"] });
    }
  });

  // Delete Cron Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/customer/cron-jobs/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "cron-jobs"] });
    }
  });

  const handleCreateCron = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command || !schedule) {
      setErrorMsg("Command and schedule are required.");
      return;
    }
    createMutation.mutate({
      command,
      schedule,
      description
    });
  };

  const filteredCrons = cronJobs.filter((job: any) => 
    job.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Clock className="w-7 h-7 text-primary" />
            Cron Job Schedules
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Automate routine backup scripts, schedule command lines, or schedule database optimizations.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add Cron Job</span>
        </button>
      </div>

      {/* Stats Counter & Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-primary rounded-full">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Scheduled Tasks</h4>
            <h3 className="text-3xl font-extrabold text-gray-800">{isLoading ? "..." : cronJobs.length}</h3>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search cron commands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-gray-800"
          />
        </div>
      </div>

      {/* Crontab list table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Retrieving crontab files...</div>
        ) : filteredCrons.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Clock className="w-12 h-12 mx-auto text-gray-200" />
            <p className="font-semibold text-gray-500">No scheduled cron jobs found</p>
            <p className="text-xs">Schedule a shell command or PHP script to run periodically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Schedule Expression</th>
                  <th className="px-6 py-4">Command to Execute</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">Active</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {filteredCrons.map((job: any) => (
                  <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-gray-900 text-xs">
                      {job.schedule}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      <div className="flex items-center gap-1.5 bg-gray-50 p-2 rounded border border-gray-100 max-w-lg overflow-x-auto">
                        <Terminal className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{job.command}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {job.description || <span className="text-gray-400 italic">No description</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleMutation.mutate({ id: job.id, payload: { is_active: !job.is_active } })}
                        className="hover:scale-105 transition-transform"
                      >
                        {job.is_active ? (
                          <ToggleRight className="w-8 h-8 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm("Remove this cron job schedule?")) {
                            deleteMutation.mutate(job.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Cron Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Schedule Automated Task
              </h2>
              <button 
                onClick={() => { setIsAddOpen(false); setErrorMsg(""); }}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateCron} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Cron Expression (min hour day month day_of_week)
                </label>
                <input
                  type="text"
                  placeholder="e.g. */5 * * * *"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-mono"
                  required
                />
                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Use standard 5-part crontab expressions.</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Command line to run
                </label>
                <textarea
                  placeholder="e.g. php /home/username/public_html/artisan schedule:run"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Task Label / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Laravel task scheduler"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setErrorMsg(""); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md flex items-center gap-2 transition-all"
                >
                  {createMutation.isPending ? "Scheduling..." : "Schedule Cron"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
