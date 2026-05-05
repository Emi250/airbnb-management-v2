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
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function addFixedItemAction(
  input: FixedExpenseItemInput
): Promise<Result> {
  const parsed = fixedExpenseItemSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    const supabase = await ensureExpenseWriter();
    const { data: maxRow } = await supabase
      .from("fixed_expense_items")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
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
    const { error } = await supabase.from("fixed_expense_items").delete().eq("id", id);
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

    const { data: item, error: itemErr } = await supabase
      .from("fixed_expense_items")
      .select("label")
      .eq("id", parsed.data.item_id)
      .maybeSingle();
    if (itemErr || !item) return { success: false, error: "Ítem no encontrado" };

    const { data: existing } = await supabase
      .from("fixed_expense_checks")
      .select("id")
      .eq("item_id", parsed.data.item_id)
      .eq("period", parsed.data.period)
      .maybeSingle();
    if (existing) return { success: false, error: "Ya está marcado como pagado este mes" };

    const { data: expense, error: expErr } = await supabase
      .from("expenses")
      .insert({
        property_id: parsed.data.property_id ?? null,
        date: parsed.data.period,
        category: "fixed",
        amount_ars: parsed.data.amount_ars,
        description: item.label,
      })
      .select("id")
      .single();
    if (expErr || !expense) return { success: false, error: expErr?.message ?? "Error al crear gasto" };

    const { error: checkErr } = await supabase.from("fixed_expense_checks").insert({
      item_id: parsed.data.item_id,
      period: parsed.data.period,
      expense_id: expense.id,
    });
    if (checkErr) {
      await supabase.from("expenses").delete().eq("id", expense.id);
      return { success: false, error: checkErr.message };
    }

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
    const { data: check } = await supabase
      .from("fixed_expense_checks")
      .select("id, expense_id")
      .eq("item_id", itemId)
      .eq("period", period)
      .maybeSingle();
    if (!check) return { success: true };

    const { error: delCheckErr } = await supabase
      .from("fixed_expense_checks")
      .delete()
      .eq("id", check.id);
    if (delCheckErr) return { success: false, error: delCheckErr.message };

    if (check.expense_id) {
      await supabase.from("expenses").delete().eq("id", check.expense_id);
    }

    revalidate();
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
