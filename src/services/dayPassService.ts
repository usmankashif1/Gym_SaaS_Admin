import { supabase } from "@/lib/supabase";
import { getCurrentGym } from "@/services/gymService";

export type DayPass = {
  id: string;
  visitorName: string;
  email: string;
  phone: string;
  visitDate: string;
  amount: number;
  paymentMethod: "cash" | "bank" | "other";
  paymentMethodDetails: string;
};

export type NewDayPass = Pick<DayPass, "visitorName" | "email" | "phone" | "amount" | "paymentMethod" | "paymentMethodDetails">;

type DayPassRow = {
  id: string;
  visitor_name: string;
  email: string | null;
  phone: string | null;
  visit_date: string;
  amount: number;
  payment_method: DayPass["paymentMethod"];
  payment_method_details: string | null;
};

function mapDayPass(row: DayPassRow): DayPass {
  return {
    id: row.id,
    visitorName: row.visitor_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    visitDate: row.visit_date,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    paymentMethodDetails: row.payment_method_details ?? "",
  };
}

export async function listDayPasses(): Promise<DayPass[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  const { data, error } = await supabase
    .from("day_passes")
    .select("id, visitor_name, email, phone, visit_date, amount, payment_method, payment_method_details")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => mapDayPass(row as DayPassRow));
}

export async function createDayPass(input: NewDayPass): Promise<DayPass> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const gym = await getCurrentGym();
  const { data, error } = await supabase
    .from("day_passes")
    .insert({
      gym_id: gym.id,
      visitor_name: input.visitorName,
      email: input.email || null,
      phone: input.phone || null,
      amount: input.amount,
      payment_method: input.paymentMethod,
      payment_method_details: input.paymentMethodDetails || null,
    })
    .select("id, visitor_name, email, phone, visit_date, amount, payment_method, payment_method_details")
    .single();
  if (error) throw error;
  return mapDayPass(data as DayPassRow);
}