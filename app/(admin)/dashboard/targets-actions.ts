"use server";

import { revalidatePath } from "next/cache";
import { monthlyTargetSchema, type MonthlyTargetInput } from "@/lib/schemas";
import { ensureDashboardAdmin } from "./_admin";

type ActionResult = { success: true } | { success: false; error: string };

export async function upsertMonthlyTargetAction(input: MonthlyTargetInput): Promise<ActionResult> {
  const parsed = monthlyTargetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  try {
    const supabase = await ensureDashboardAdmin();
    const { error } = await supabase
      .from("monthly_targets")
      .upsert(
        {
          property_id: parsed.data.property_id,
          month: parsed.data.month,
          target_revenue_ars: parsed.data.target_revenue_ars,
          target_occupancy: parsed.data.target_occupancy ?? null,
        },
        { onConflict: "property_id,month" }
      );
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteMonthlyTargetAction(input: {
  property_id: string;
  month: string;
}): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(input.property_id) || !/^\d{4}-\d{2}-01$/.test(input.month)) {
    return { success: false, error: "Datos inválidos" };
  }
  try {
    const supabase = await ensureDashboardAdmin();
    const { error } = await supabase
      .from("monthly_targets")
      .delete()
      .eq("property_id", input.property_id)
      .eq("month", input.month);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
