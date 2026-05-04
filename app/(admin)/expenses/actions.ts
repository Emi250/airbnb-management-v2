"use server";

import { revalidatePath } from "next/cache";
import { expenseSchema, type ExpenseInput } from "@/lib/schemas";
import { ensureAdmin } from "./_admin";

export async function createExpenseAction(
  input: ExpenseInput
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    const supabase = await ensureAdmin();
    const { error } = await supabase.from("expenses").insert({
      property_id: parsed.data.property_id || null,
      date: parsed.data.date,
      category: parsed.data.category,
      amount_ars: parsed.data.amount_ars,
      description: parsed.data.description || null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteExpenseAction(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await ensureAdmin();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
