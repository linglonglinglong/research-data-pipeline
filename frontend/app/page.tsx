"use client";

import { useState, useEffect } from "react";
import { useDatasets } from "@/hooks/useDatasets";
import { apiClient } from "@/lib/apiClient";

export default function DashboardPage() {
  const { datasets } = useDatasets();
  const [datasetId, setDatasetId] = useState("");
  const [anomalies, setAnomalies] = useState<any[]>([]);
  
  // Pagination & Limit State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20); // Default limit is now dynamic
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Research Filter State (SQL Query Parameters)
  const [sensorId, setSensorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Auto-select the first dataset when they load
  useEffect(() => {
    if (datasets.length > 0 && !datasetId) {
      setDatasetId(datasets[0].id.toString());
    }
  }, [datasets, datasetId]);

  // Fetch data whenever the dataset, page, or limit changes
  useEffect(() => {
    if (datasetId) {
      fetchAnomalies();
    }
  }, [datasetId, page, limit]);

  const fetchAnomalies = async () => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(), // No longer hardcoded
      });

      if (sensorId) params.append("sensor_id", sensorId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const payload = await apiClient.get(`/datasets/${datasetId}/anomalies?${params.toString()}`);
      
      setAnomalies(payload.data);
      setTotalPages(payload.total_pages);
      setTotalRecords(payload.total);
    } catch (e) {
      console.error("Failed to fetch anomalies", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(1); 
    fetchAnomalies();
  };

  const handleClearFilters = () => {
    setSensorId("");
    setStartDate("");
    setEndDate("");
    
    if (page === 1) {
      fetchAnomalies(); 
    } else {
      setPage(1);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header Section */}
      <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Detected Anomalies</h2>
          <p className="text-sm text-gray-500 mt-1">Total Flags: <span className="font-bold text-gray-700">{totalRecords}</span></p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Row Limit Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rows:</label>
            <select 
              value={limit} 
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1); // Reset to page 1 when changing page size
              }}
              className="border border-gray-300 rounded-md px-2 py-1.5 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            >
              {[10, 20, 50, 100].map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>

          {/* Dataset Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dataset:</label>
            <select 
              value={datasetId} 
              onChange={(e) => { 
                setDatasetId(e.target.value); 
                setPage(1); 
              }}
              className="border border-gray-300 rounded-md px-3 py-1.5 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            >
              <option value="" disabled>Select dataset...</option>
              {datasets.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Discovery Filter Bar */}
      <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Sensor ID</label>
          <input 
            type="text"
            placeholder="Search ID..."
            value={sensorId}
            onChange={(e) => setSensorId(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm w-40 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">Start Date</label>
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">End Date</label>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleApplyFilters}
            disabled={isSearching}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Apply Filters"}
          </button>
          <button 
            onClick={handleClearFilters}
            className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-200 transition"
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Table Section */}
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
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                  {isSearching ? "Querying database..." : "No anomalies found matching these SQL criteria."}
                </td>
              </tr>
            ) : (
              anomalies.map((a) => (
                <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 text-gray-500">{new Date(a.detected_at).toLocaleString()}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{a.sensor_id}</td>
                  <td className="px-6 py-4 text-gray-600">{a.location}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 tracking-tight">
                      {a.anomaly_type ? a.anomaly_type.replace('_', ' ').toUpperCase() : 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-red-600">{a.confidence_score}</td>
                  <td className="px-6 py-4 font-mono text-gray-700">{a.temperature}°C</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <button 
            onClick={() => setPage(p => Math.max(p - 1, 1))} 
            disabled={page === 1} 
            className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page <span className="font-bold text-gray-900">{page}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
          </span>
          <button 
            onClick={() => setPage(p => Math.min(p + 1, totalPages))} 
            disabled={page === totalPages} 
            className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}