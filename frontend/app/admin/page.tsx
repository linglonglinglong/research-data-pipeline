"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";

export default function AdminPage() {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("Creating...");
    try {
      await apiClient.post("/datasets/", { name, description: "Created via UI" });
      setMsg("Dataset created successfully!");
      setName("");
    } catch (error: any) {
      setMsg(error.message || "Failed to create dataset.");
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm max-w-md">
      <h2 className="text-xl font-bold mb-4">Create New Dataset (Table)</h2>
      
      {msg && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded text-sm">
          {msg}
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dataset Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-black outline-none" 
            placeholder="e.g., LAB_A_SENSORS" 
            required 
          />
        </div>
        <button type="submit" className="bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 w-full transition">
          Create Dataset
        </button>
      </form>
    </div>
  );
}