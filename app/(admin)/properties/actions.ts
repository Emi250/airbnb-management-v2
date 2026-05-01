"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { propertySchema, type PropertyInput } from "@/lib/schemas";

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

export async function upsertPropertyAction(
  id: string | null,
  input: PropertyInput
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const supabase = await ensureAdmin();
    if (id) {
      const { error } = await supabase.from("properties").update(parsed.data).eq("id", id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("properties").insert(parsed.data);
      if (error) return { success: false, error: error.message };
    }
    revalidatePath("/properties");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
