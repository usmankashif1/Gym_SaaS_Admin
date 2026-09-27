import { supabase } from "@/lib/supabase";

export async function recordMemberCheckIn(memberId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("record_member_check_in", { p_member_id: memberId });
  if (error) throw error;
}
