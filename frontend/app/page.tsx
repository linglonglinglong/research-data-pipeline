"use client";

import { useState, useEffect } from "react";
import { useDatasets } from "@/hooks/useDatasets";
import { apiClient } from "@/lib/apiClient";

export default function DashboardPage() {
  const { datasets } = useDatasets();
  const [datasetId, setDatasetId] = useState("");
  const [anomalies, setAnomalies] = useState<any[]>([]);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Auto-select the first dataset when they load
  useEffect(() => {
    if (datasets.length > 0 && !datasetId) {
      setDatasetId(datasets[0].id.toString());
    }
  }, [datasets, datasetId]);

  // Fetch data whenever the dataset or page changes
  useEffect(() => {
    if (datasetId) {
      fetchAnomalies();
    }
  }, [datasetId, page]);

  const fetchAnomalies = async () => {
    try {
      const payload = await apiClient.get(`/datasets/${datasetId}/anomalies?page=${page}&limit=15`);
      setAnomalies(payload.data);
      setTotalPages(payload.total_pages);
      setTotalRecords(payload.total);
    } catch (e) {
      console.error("Failed to fetch anomalies", e);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-xl font-semibold">Detected Anomalies</h2>
          <p className="text-sm text-gray-500 mt-1">Total Flags: {totalRecords}</p>
        </div>
        <select 
          value={datasetId} 
          onChange={(e) => { 
            setDatasetId(e.target.value); 
            setPage(1); // Reset to page 1 when changing datasets
          }}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="" disabled>Filter by dataset...</option>
          {datasets.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Detected At</th>
              <th className="px-6 py-3">Sensor ID</th>
              <th className="px-6 py-3">Location</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Score</th>
              <th className="px-6 py-3">Temp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {anomalies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No anomalies detected for this dataset.
                </td>
              </tr>
            ) : (
              anomalies.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-500">{new Date(a.detected_at).toLocaleString()}</td>
                  <td className="px-6 py-4 font-medium">{a.sensor_id}</td>
                  <td className="px-6 py-4">{a.location}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      {a.anomaly_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-red-600">{a.confidence_score}</td>
                  <td className="px-6 py-4 font-mono">{a.temperature}°C</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <button 
            onClick={() => setPage(p => Math.max(p - 1, 1))} 
            disabled={page === 1} 
            className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
          </span>
          <button 
            onClick={() => setPage(p => Math.min(p + 1, totalPages))} 
            disabled={page === totalPages} 
            className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}