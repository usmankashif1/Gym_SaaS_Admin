import { PAGE_SIZE } from "@/constants/pagination";
import { supabase } from "@/lib/supabase";
import { getCurrentGym } from "@/services/gymService";
import type { Payment, PaymentStatus } from "@/types/domain";

function mapPayment(row: any): Payment {
  const dueDate = row.due_date;
  const status: PaymentStatus = row.status === "paid" ? "paid" : dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : "due";
  const member = Array.isArray(row.members) ? row.members[0] : row.members;
  const membershipPlan = Array.isArray(member?.membership_plans) ? member.membership_plans[0] : member?.membership_plans;
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: `${member?.first_name ?? "Member"} ${member?.last_name ?? ""}`.trim(),
    membershipPlanName: membershipPlan?.name ?? member?.plan_name ?? "",
    amount: Number(row.amount),
    dueDate,
    paidAt: row.paid_at,
    status,
  };
}

export async function listPayments(filter: PaymentStatus | "all" = "all", page = 0): Promise<{ items: Payment[]; total: number }> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error: generationError } = await supabase.rpc("generate_due_membership_payments");
  if (generationError) throw generationError;
  const gym = await getCurrentGym();
  let query = supabase.from("payments").select("*, members(first_name,last_name,plan_name,membership_plans(name))", { count: "exact" }).eq("gym_id", gym.id).order("due_date", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (filter === "paid") query = query.eq("status", "paid");
  else if (filter === "due") query = query.eq("status", "pending").eq("due_date", new Date().toISOString().slice(0, 10));
  else if (filter === "overdue") query = query.eq("status", "pending").lt("due_date", new Date().toISOString().slice(0, 10));
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data.map(mapPayment), total: count ?? 0 };
}

export async function recordPayment(paymentId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("record_membership_payment", { p_payment_id: paymentId });
  if (error) throw error;
}