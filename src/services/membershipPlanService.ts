import { supabase } from "@/lib/supabase";
import { getCurrentGym } from "@/services/gymService";
import type { MembershipPlan } from "@/types/domain";

type PlanInput = Pick<MembershipPlan, "name" | "price">;
type PlanRow = { id: string; name: string; price: number; is_active: boolean; created_at: string };

function mapPlan(row: PlanRow): MembershipPlan {
  return { id: row.id, name: row.name, price: Number(row.price), isActive: row.is_active, createdAt: row.created_at };
}

export async function listMembershipPlans(includeInactive = false): Promise<{ plans: MembershipPlan[]; canManage: boolean }> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  let query = supabase
    .from("membership_plans")
    .select("id,name,price,is_active,created_at")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return { plans: data.map((row) => mapPlan(row as PlanRow)), canManage: gym.role === "owner" };
}

export async function createMembershipPlan(input: PlanInput): Promise<MembershipPlan> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  const { data, error } = await supabase
    .from("membership_plans")
    .insert({ gym_id: gym.id, name: input.name.trim(), price: input.price })
    .select("id,name,price,is_active,created_at")
    .single();
  if (error) throw error;
  return mapPlan(data as PlanRow);
}

export async function updateMembershipPlan(planId: string, input: PlanInput): Promise<MembershipPlan> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  const { data, error } = await supabase
    .from("membership_plans")
    .update({ name: input.name.trim(), price: input.price })
    .eq("id", planId)
    .eq("gym_id", gym.id)
    .select("id,name,price,is_active,created_at")
    .single();
  if (error) throw error;
  return mapPlan(data as PlanRow);
}

export async function setMembershipPlanActive(planId: string, isActive: boolean): Promise<MembershipPlan> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  const { data, error } = await supabase
    .from("membership_plans")
    .update({ is_active: isActive })
    .eq("id", planId)
    .eq("gym_id", gym.id)
    .select("id,name,price,is_active,created_at")
    .single();
  if (error) throw error;
  return mapPlan(data as PlanRow);
}