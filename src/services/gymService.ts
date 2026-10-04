import { supabase } from "@/lib/supabase";
import type { GymContext } from "@/types/domain";

export async function getCurrentGym(): Promise<GymContext> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userResult.user) throw new Error("Sign in to open your gym workspace.");

  const { data, error } = await supabase
    .from("gym_memberships")
    .select("gym_id, role, gyms!inner(name,logo_path,admission_fee,day_pass_fee)")
    .eq("user_id", userResult.user.id)
    .order("created_at", { ascending: true })
    .order("gym_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("This account is not connected to a gym.");
  const gym = data.gyms as unknown as { name: string; logo_path: string | null; admission_fee: number; day_pass_fee: number | null };
  const logoUrl = gym.logo_path
    ? supabase.storage.from("gym-logos").getPublicUrl(gym.logo_path).data.publicUrl
    : null;
  return { id: data.gym_id, name: gym.name, role: data.role, admissionFee: Number(gym.admission_fee), dayPassFee: gym.day_pass_fee === null ? null : Number(gym.day_pass_fee), logoPath: gym.logo_path, logoUrl };
}

export async function updateGymAdmissionFee(admissionFee: number): Promise<number> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  if (gym.role !== "owner") throw new Error("Only the gym owner can update the admission fee.");
  if (!Number.isFinite(admissionFee) || admissionFee < 0) throw new Error("Admission fee must be zero or greater.");

  const { data, error } = await supabase
    .from("gyms")
    .update({ admission_fee: admissionFee })
    .eq("id", gym.id)
    .select("admission_fee")
    .single();
  if (error) throw error;
  return Number(data.admission_fee);
}

export async function updateGymDayPassFee(dayPassFee: number): Promise<number> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  if (gym.role !== "owner") throw new Error("Only the gym owner can update the day pass fee.");
  if (!Number.isFinite(dayPassFee) || dayPassFee <= 0) throw new Error("Day pass fee must be greater than zero.");

  const { data, error } = await supabase
    .from("gyms")
    .update({ day_pass_fee: dayPassFee })
    .eq("id", gym.id)
    .select("day_pass_fee")
    .single();
  if (error) throw error;
  return Number(data.day_pass_fee);
}

export async function uploadGymLogo(file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${gym.id}/logo-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("gym-logos").upload(path, file, {
    cacheControl: "0",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: profileError } = await supabase.from("gyms").update({ logo_path: path }).eq("id", gym.id);
  if (profileError) {
    await supabase.storage.from("gym-logos").remove([path]);
    throw profileError;
  }

  if (gym.logoPath) await supabase.storage.from("gym-logos").remove([gym.logoPath]);
  return supabase.storage.from("gym-logos").getPublicUrl(path).data.publicUrl;
}

export async function updateGymName(name: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  if (gym.role !== "owner") throw new Error("Only the gym owner can update gym details.");

  const normalizedName = name.trim();
  if (normalizedName.length < 2 || normalizedName.length > 100) {
    throw new Error("Gym name must be between 2 and 100 characters.");
  }

  const { data, error } = await supabase
    .from("gyms")
    .update({ name: normalizedName })
    .eq("id", gym.id)
    .select("name")
    .single();
  if (error) throw error;
  return data.name;
}