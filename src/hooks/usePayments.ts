import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { supabase } from "@/lib/supabase";
import { listPayments, recordPayment } from "@/services/paymentService";
import type { Payment, PaymentStatus } from "@/types/domain";

export type PaymentView = "today" | "overdue" | "history";

function getFilter(view: PaymentView): PaymentStatus {
  if (view === "history") return "paid";
  return view === "today" ? "due" : "overdue";
}

export function usePayments(view: PaymentView, page: number) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const queryKey = `${view}:${page}`;
  const loading = Boolean(supabase && loadedKey !== queryKey);

  const loadPayments = useCallback(async (current: { value: boolean }) => {
    const result = await listPayments(getFilter(view), page);
    if (!current.value) return;
    setPayments(result.items);
    setTotal(result.total);
    setFailure(null);
    setLoadedKey(queryKey);
  }, [page, queryKey, view]);

  useFocusEffect(useCallback(() => {
    if (!supabase) return;
    const current = { value: true };
    void loadPayments(current).catch((caught: unknown) => {
      if (!current.value) return;
      setFailure({ key: queryKey, message: caught instanceof Error ? caught.message : "Could not load payments." });
      setLoadedKey(queryKey);
    });
    return () => { current.value = false; };
  }, [loadPayments, queryKey]));

  const markPaid = async (paymentId: string) => {
    await recordPayment(paymentId);
    const current = { value: true };
    await loadPayments(current);
  };

  return { payments, total, loading, error: failure?.key === queryKey ? failure.message : "", markPaid };
}