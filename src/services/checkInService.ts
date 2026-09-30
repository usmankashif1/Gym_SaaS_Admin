import { supabase } from "@/lib/supabase";

export async function listMemberCheckIns(memberIds: string[], date: string): Promise<string[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (memberIds.length === 0) return [];
  const { data, error } = await supabase
    .from("member_check_ins")
    .select("member_id")
    .in("member_id", memberIds)
    .eq("check_in_date", date);
  if (error) throw error;
  return data.map((checkIn) => checkIn.member_id);
}

export async function recordMemberCheckIn(memberId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("record_member_check_in", { p_member_id: memberId });
  if (error) throw error;
}
