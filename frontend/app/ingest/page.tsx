"use client";

import { useState } from "react";
import { useDatasets } from "@/hooks/useDatasets";
import { apiClient } from "@/lib/apiClient";

export default function IngestPage() {
  const { datasets, loading } = useDatasets();
  const [selectedDataset, setSelectedDataset] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedDataset) return;
    
    setMsg("Uploading and processing CSV...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await apiClient.upload(`/ingest/${selectedDataset}/upload`, formData);
      setMsg(`Success! Inserted ${data.curated_records_inserted} records.`);
      setFile(null);
    } catch (error: any) {
      setMsg(error.message || "Upload failed.");
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm max-w-md">
      <h2 className="text-xl font-bold mb-4">Upload CSV Data</h2>
      
      {msg && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded text-sm">
          {msg}
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Dataset</label>
          <select 
            value={selectedDataset} 
            onChange={e => setSelectedDataset(e.target.value)} 
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            required
          >
            <option value="" disabled>
              {loading ? "Loading datasets..." : "Select a dataset..."}
            </option>
            {datasets.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
          <input 
            type="file" 
            accept=".csv"
            onChange={e => setFile(e.target.files?.[0] || null)} 
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
            required 
          />
        </div>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 w-full transition">
          Process & Ingest Data
        </button>
      </form>
    </div>
  );
}