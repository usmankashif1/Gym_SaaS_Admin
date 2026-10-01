import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { getRevenueOverview, type RevenueOverview } from "@/services/revenueService";

export function useRevenue() {
  const [data, setData] = useState<RevenueOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError("");

    try {
      const overview = await getRevenueOverview();
      if (currentRequestId === requestId.current) setData(overview);
    } catch (caught) {
      if (currentRequestId === requestId.current) setError(caught instanceof Error ? caught.message : "Could not load revenue.");
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { requestId.current += 1; };
  }, [load]));

  return { data, error, loading, retry: load };
}