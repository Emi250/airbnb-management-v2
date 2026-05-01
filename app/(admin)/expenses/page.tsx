import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { listProperties } from "@/lib/queries/reservations";
import { ExpensesView } from "./expenses-view";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const [expR, properties] = await Promise.all([
    supabase
      .from("expenses")
      .select(`*, property:properties(name,color_hex)`)
      .order("date", { ascending: false }),
    listProperties(),
  ]);
  return (
    <div>
      <PageHeader title="Gastos" description="Registro de gastos por propiedad" />
      <ExpensesView expenses={expR.data ?? []} properties={properties} />
    </div>
  );
}
