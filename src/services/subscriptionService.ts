import { supabase } from "@/lib/supabase";
import { getCurrentGym } from "@/services/gymService";
import type { GymSubscription } from "@/types/domain";

export async function getSubscription(): Promise<GymSubscription | null> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  const { data, error } = await supabase.from("gym_subscriptions").select("plan_key,status,current_period_end").eq("gym_id", gym.id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { planKey: data.plan_key, status: data.status, currentPeriodEnd: data.current_period_end };
}