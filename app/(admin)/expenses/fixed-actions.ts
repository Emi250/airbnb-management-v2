"use server";

import { revalidatePath } from "next/cache";
import {
  fixedExpenseItemSchema,
  fixedExpenseMarkSchema,
  type FixedExpenseItemInput,
  type FixedExpenseMarkInput,
} from "@/lib/schemas";
import { ensureExpenseWriter } from "./_admin";

type Result = { success: true } | { success: false; error: string };

function revalidate() {
  revalidatePath("/", "layout");
}

export async function addFixedItemAction(
  input: FixedExpenseItemInput
): Promise<Result> {
  const parsed = fixedExpenseItemSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    const supabase = await ensureExpenseWriter();
    const { data: maxRow, error: maxError } = await supabase
      .from("fixed_expense_items")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxError) return { success: false, error: maxError.message };
    const nextPos = (maxRow?.position ?? 0) + 10;
    const { error } = await supabase
      .from("fixed_expense_items")
      .insert({ label: parsed.data.label, position: nextPos });
    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function removeFixedItemAction(id: string): Promise<Result> {
  try {
    const supabase = await ensureExpenseWriter();
    const { error } = await supabase.from("fixed_expense_items").update({ active: false }).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function markFixedPaidAction(
  input: FixedExpenseMarkInput
): Promise<Result> {
  const parsed = fixedExpenseMarkSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    const supabase = await ensureExpenseWriter();

    const { error } = await supabase.rpc("mark_fixed_paid", {
      p_item_id: parsed.data.item_id,
      p_period: parsed.data.period,
      p_amount: parsed.data.amount_ars,
      p_property_id: parsed.data.property_id ?? null,
    });
    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function unmarkFixedPaidAction(
  itemId: string,
  period: string
): Promise<Result> {
  try {
    const supabase = await ensureExpenseWriter();
    const { error } = await supabase.rpc("unmark_fixed_paid", {
      p_item_id: itemId, p_period: period,
    });
    if (error) return { success: false, error: error.message };
    revalidate();
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
