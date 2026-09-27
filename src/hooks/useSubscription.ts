import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { getDashboardSummary } from "@/services/dashboardService";
import { getSubscription } from "@/services/subscriptionService";
import type { GymSubscription } from "@/types/domain";

export function useSubscription() {
  const [subscription, setSubscription] = useState<GymSubscription | null>(null);
  const [activeMembers, setActiveMembers] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => {
    let current = true;
    void Promise.all([getSubscription(), getDashboardSummary()])
      .then(([nextSubscription, summary]) => {
        if (!current) return;
        setSubscription(nextSubscription);
        setActiveMembers(summary.activeMembers);
        setError("");
        setLoaded(true);
      })
      .catch((caught: unknown) => {
        if (!current) return;
        setError(caught instanceof Error ? caught.message : "Could not load subscription details.");
        setLoaded(true);
      });
    return () => { current = false; };
  }, []));

  return { subscription, activeMembers, loading: !loaded, error };
}