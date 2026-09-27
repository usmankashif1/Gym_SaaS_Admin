import { supabase } from "@/lib/supabase";

export type DashboardSummary = {
  activeMembers: number;
  checkInsToday: number;
  revenueThisMonth: number;
  overdueAmount: number;
  dueTodayAmount: number;
};

type DashboardMetricsRow = {
  active_members: number;
  check_ins_today: number;
  revenue_this_month: number;
  overdue_amount: number;
  due_today_amount: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error: generationError } = await supabase.rpc("generate_due_membership_payments");
  if (generationError) throw generationError;
  const { data, error } = await supabase.rpc("get_dashboard_metrics").single();
  if (error) throw error;
  const metrics = data as DashboardMetricsRow;
  return {
    activeMembers: Number(metrics.active_members),
    checkInsToday: Number(metrics.check_ins_today),
    revenueThisMonth: Number(metrics.revenue_this_month),
    overdueAmount: Number(metrics.overdue_amount),
    dueTodayAmount: Number(metrics.due_today_amount),
  };
}