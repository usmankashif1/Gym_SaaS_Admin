import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { getDashboardSummary, type DashboardSummary } from "@/services/dashboardService";
import { listPayments } from "@/services/paymentService";
import type { Payment } from "@/types/domain";

type DashboardData = {
  summary: DashboardSummary;
  dueTodayPayments: Payment[];
  overduePayments: Payment[];
  dueTodayCount: number;
  overdueCount: number;
};

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const loading = data === null && !error;

  useFocusEffect(useCallback(() => {
    let current = true;
    void Promise.all([
      getDashboardSummary(),
      listPayments("due"),
      listPayments("overdue"),
    ])
      .then(([summary, dueToday, overdue]) => {
        if (!current) return;
        setData({
          summary,
          dueTodayPayments: dueToday.items,
          overduePayments: overdue.items,
          dueTodayCount: dueToday.total,
          overdueCount: overdue.total,
        });
        setError("");
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof Error ? caught.message : "Could not load the dashboard.");
      });
    return () => { current = false; };
  }, []));

  return {
    summary: data?.summary ?? null,
    dueTodayPayments: data?.dueTodayPayments ?? [],
    overduePayments: data?.overduePayments ?? [],
    dueTodayCount: data?.dueTodayCount ?? 0,
    overdueCount: data?.overdueCount ?? 0,
    loading,
    error,
  };
}