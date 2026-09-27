import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { listMembershipPlans } from "@/services/membershipPlanService";
import type { MembershipPlan } from "@/types/domain";

export function useMembershipPlans(includeInactive = false) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => {
    let current = true;
    void listMembershipPlans(includeInactive)
      .then((result) => {
        if (!current) return;
        setPlans(result.plans);
        setCanManage(result.canManage);
        setError("");
        setLoaded(true);
      })
      .catch((caught: unknown) => {
        if (!current) return;
        setError(caught instanceof Error ? caught.message : "Could not load membership plans.");
        setLoaded(true);
      });
    return () => { current = false; };
  }, [includeInactive]));

  const replacePlan = (saved: MembershipPlan) => {
    setPlans((current) => {
      const exists = current.some((plan) => plan.id === saved.id);
      return exists ? current.map((plan) => plan.id === saved.id ? saved : plan) : [...current, saved];
    });
  };

  return { plans, canManage, loading: !loaded, error, replacePlan };
}