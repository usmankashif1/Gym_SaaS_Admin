import { PAGE_SIZE } from "@/constants/pagination";
import { supabase } from "@/lib/supabase";
import { getCurrentGym } from "@/services/gymService";
import type { Member, MembershipPlan } from "@/types/domain";

export type MemberInput = Pick<Member, "name" | "email" | "phone"> & { planId: string; admissionFee?: number };
export type NewMemberInput = MemberInput & { signupDate: string };

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
  membership_plans?: Pick<MembershipPlan, "id" | "name" | "price"> | Pick<MembershipPlan, "id" | "name" | "price">[] | null;
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
    status: row.status,
    joinedAt: row.joined_at,
    nextDue: row.next_due,
  };
}

export async function listMembers(search = "", page = 0): Promise<{ items: Member[]; total: number }> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  let query = supabase
    .from("members")
    .select("*, membership_plans(id,name,price)", { count: "exact" })
    .eq("gym_id", gym.id)
    .order("joined_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  const safeSearch = search.trim().slice(0, 80).replace(/[(),]/g, " ");
  if (safeSearch) query = query.or(`first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
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
  });
  if (error) throw error;
  const created = data as Pick<MemberRow, "id">;
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("*, membership_plans(id,name,price)")
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
    .select("*, membership_plans(id,name,price)")
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