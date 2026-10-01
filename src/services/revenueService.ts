import { supabase } from "@/lib/supabase";

export type RevenueMonth = {
  monthStart: string;
  total: number;
};

export type RevenueOverview = {
  months: RevenueMonth[];
  collectedToday: number;
  dueToday: number;
  overdue: number;
};

type RevenueOverviewRow = {
  month_start: string;
  monthly_revenue: number | string;
  collected_today: number | string;
  due_today: number | string;
  overdue: number | string;
};

export async function getRevenueOverview(): Promise<RevenueOverview> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error: generationError } = await supabase.rpc("generate_due_membership_payments");
  if (generationError) throw generationError;

  const { data, error } = await supabase.rpc("get_revenue_overview");
  if (error) throw error;

  const rows = (data ?? []) as unknown as RevenueOverviewRow[];
  const current = rows[0];

  return {
    months: rows.map((row) => ({ monthStart: row.month_start, total: Number(row.monthly_revenue) })),
    collectedToday: Number(current?.collected_today ?? 0),
    dueToday: Number(current?.due_today ?? 0),
    overdue: Number(current?.overdue ?? 0),
  };
}