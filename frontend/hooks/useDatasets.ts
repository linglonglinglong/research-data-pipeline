import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";

export function useDatasets() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await apiClient.get("/datasets/");
      setDatasets(data);
    } catch (e) {
      console.error("Dataset fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { datasets, loading, refresh: load };
}