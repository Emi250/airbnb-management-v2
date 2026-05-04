import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { listProperties } from "@/lib/queries/reservations";
import { ExpensesView } from "./expenses-view";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const [expR, properties, fixedItemsR, fixedChecksR] = await Promise.all([
    supabase
      .from("expenses")
      .select(`*, property:properties(name,color_hex)`)
      .order("date", { ascending: false }),
    listProperties(),
    supabase
      .from("fixed_expense_items")
      .select("*")
      .eq("active", true)
      .order("position", { ascending: true }),
    supabase
      .from("fixed_expense_checks")
      .select("*, expense:expenses(amount_ars)"),
  ]);

  const fixedChecks = (fixedChecksR.data ?? []).map((c) => ({
    id: c.id,
    item_id: c.item_id,
    period: c.period,
    expense_id: c.expense_id,
    paid_at: c.paid_at,
    amount_ars:
      (c as { expense?: { amount_ars: number } | null }).expense?.amount_ars ?? undefined,
  }));

  return (
    <div>
      <PageHeader title="Gastos" description="Registro de gastos por propiedad" />
      <ExpensesView
        expenses={expR.data ?? []}
        properties={properties}
        fixedItems={fixedItemsR.data ?? []}
        fixedChecks={fixedChecks}
      />
    </div>
  );
}
