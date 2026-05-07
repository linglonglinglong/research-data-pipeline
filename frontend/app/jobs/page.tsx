"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await apiClient.get("/datasets/pull-jobs");
      setJobs(data);
    } catch (e) {
      console.error("Failed to fetch jobs", e);
    }
  };

  const handleTrigger = async (jobId: string) => {
    setLoadingId(jobId);
    setMsg(`Triggering job ${jobId}...`);
    try {
      // Calls the POST /ingest/pull/{job_id} endpoint we created
      const data = await apiClient.post(`/ingest/pull/${jobId}`, {});
      setMsg(`Success! ${data.message} | Processed ${data.curated_records_inserted} records.`);
    } catch (error: any) {
      setMsg(error.message || "Failed to trigger job.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-semibold">Automated Pull Jobs</h2>
        <p className="text-sm text-gray-500 mt-1">Manage and manually trigger scheduled ingestion tasks.</p>
      </div>

      {msg && (
        <div className="m-6 p-4 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-sm">
          {msg}
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Job ID</th>
              <th className="px-6 py-3">Target Dataset ID</th>
              <th className="px-6 py-3">Source Configuration</th>
              <th className="px-6 py-3">Schedule (Cron)</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No automated jobs configured in the database.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">{job.id}</td>
                  <td className="px-6 py-4">{job.dataset_id}</td>
                  <td className="px-6 py-4 font-mono text-xs truncate max-w-xs">{job.source_url}</td>
                  <td className="px-6 py-4 font-mono text-xs">{job.schedule_cron}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${job.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {job.is_active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleTrigger(job.id)}
                      disabled={loadingId === job.id}
                      className="bg-black text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50"
                    >
                      {loadingId === job.id ? 'Running...' : 'Run Now'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}