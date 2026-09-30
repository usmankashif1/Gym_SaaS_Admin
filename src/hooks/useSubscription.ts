import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { getSubscription } from "@/services/subscriptionService";
import type { GymSubscription } from "@/types/domain";

export function useSubscription() {
  const [subscription, setSubscription] = useState<GymSubscription | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => {
    let current = true;
    void getSubscription()
      .then((nextSubscription) => {
        if (!current) return;
        setSubscription(nextSubscription);
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

  return { subscription, loading: !loaded, error };
}