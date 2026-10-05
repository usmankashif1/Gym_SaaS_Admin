import { MEMBER_PAGE_SIZE } from "@/constants/pagination";
import { supabase } from "@/lib/supabase";
import { getCurrentGym } from "@/services/gymService";
import type { Member, MembershipPlan } from "@/types/domain";

export type MemberInput = Pick<Member, "name" | "email" | "phone"> & { planId: string; admissionFee?: number };
export type NewMemberInput = MemberInput & { signupDate: string };
export type MemberSortKey = "name" | "plan" | "joined" | "status";
export type MemberSortDirection = "asc" | "desc";

type MemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  plan_name: string;
  membership_plan_id: string | null;
  joined_at: string;
  next_due: string;
  status: Member["status"];
  membership_plans?: (Pick<MembershipPlan, "id" | "name" | "price"> & { duration_months: number }) | ((Pick<MembershipPlan, "id" | "name" | "price"> & { duration_months: number })[]) | null;
};

function mapMember(row: MemberRow): Member {
  const plan = Array.isArray(row.membership_plans) ? row.membership_plans[0] : row.membership_plans;
  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email ?? "",
    phone: row.phone ?? "",
    planId: plan?.id ?? row.membership_plan_id,
    plan: plan?.name ?? row.plan_name,
    planPrice: plan ? Number(plan.price) : null,
    planDurationMonths: plan?.duration_months ?? null,
    status: row.status,
    joinedAt: row.joined_at,
    nextDue: row.next_due,
  };
}

export async function listMembers(search = "", page = 0, sortKey: MemberSortKey = "joined", sortDirection: MemberSortDirection = "desc", status: Member["status"] | "all" = "all", joinedFrom: string | null = null, joinedThrough: string | null = null, planId: string | null = null): Promise<{ items: Member[]; total: number }> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  let query = supabase
    .from("members")
    .select("*, membership_plans(id,name,price,duration_months)", { count: "exact" })
    .eq("gym_id", gym.id);
  if (status !== "all") query = query.eq("status", status);
  if (joinedFrom) query = query.gte("joined_at", joinedFrom);
  if (joinedThrough) query = query.lte("joined_at", joinedThrough);
  if (planId) query = query.eq("membership_plan_id", planId);
  const ascending = sortDirection === "asc";
  if (sortKey === "name") query = query.order("first_name", { ascending }).order("last_name", { ascending });
  else if (sortKey === "plan") query = query.order("plan_name", { ascending }).order("first_name", { ascending: true });
  else if (sortKey === "status") query = query.order("status", { ascending }).order("first_name", { ascending: true });
  else query = query.order("joined_at", { ascending }).order("first_name", { ascending: true });
  query = query.range(page * MEMBER_PAGE_SIZE, (page + 1) * MEMBER_PAGE_SIZE - 1);
  const searchTerms = search.trim().slice(0, 80).replace(/[(),]/g, " ").split(/\s+/).filter(Boolean);
  if (searchTerms.length) {
    const termFilters = searchTerms.map((term) => `or(first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%)`);
    query = query.or(`and(${termFilters.join(",")})`);
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data.map((row) => mapMember(row as MemberRow)), total: count ?? 0 };
}

export async function createMember(input: NewMemberInput): Promise<Member> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const [firstName, ...lastNameParts] = input.name.trim().split(/\s+/);
  const { data, error } = await supabase.rpc("create_member_with_initial_payment", {
    p_membership_plan_id: input.planId,
    p_first_name: firstName,
    p_last_name: lastNameParts.join(" "),
    p_email: input.email.trim() || null,
    p_phone: input.phone.trim() || null,
    p_admission_fee: input.admissionFee ?? null,
    p_signup_date: input.signupDate,
    p_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  if (error) throw error;
  const created = data as Pick<MemberRow, "id">;
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("*, membership_plans(id,name,price,duration_months)")
    .eq("id", created.id)
    .single();
  if (memberError) throw memberError;
  return mapMember(member as MemberRow);
}

export async function updateMember(memberId: string, input: MemberInput): Promise<Member> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  const { data: plan, error: planError } = await supabase
    .from("membership_plans")
    .select("name")
    .eq("id", input.planId)
    .eq("gym_id", gym.id)
    .eq("is_active", true)
    .single();
  if (planError) throw planError;

  const [firstName, ...lastNameParts] = input.name.trim().split(/\s+/);
  const { data, error } = await supabase
    .from("members")
    .update({
      first_name: firstName,
      last_name: lastNameParts.join(" "),
      email: input.email.trim() || null,
      phone: input.phone.trim() || null,
      plan_name: plan.name,
      membership_plan_id: input.planId,
    })
    .eq("id", memberId)
    .eq("gym_id", gym.id)
    .select("*, membership_plans(id,name,price,duration_months)")
    .single();
  if (error) throw error;
  return mapMember(data as MemberRow);
}

export async function deleteMember(memberId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", memberId)
    .eq("gym_id", gym.id);
  if (error) throw error;
}