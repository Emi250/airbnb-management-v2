"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeRateSchema,
  propertySchema,
  type ExchangeRateInput,
  type PropertyInput,
} from "@/lib/schemas";

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data?.role !== "admin") throw new Error("Acceso restringido");
  return supabase;
}

export async function updateExchangeRateAction(input: ExchangeRateInput) {
  const parsed = exchangeRateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  try {
    const supabase = await ensureAdmin();
    const { error } = await supabase.from("exchange_rates").insert(parsed.data);
    if (error) return { success: false, error: error.message };
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updatePropertyAction(id: string, input: PropertyInput) {
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  try {
    const supabase = await ensureAdmin();
    const { error } = await supabase.from("properties").update(parsed.data).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/settings");
    revalidatePath("/properties");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
