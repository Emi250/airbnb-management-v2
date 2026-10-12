import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "./reports-client";
import { readAll } from "@/lib/queries/read-all";

export default async function ReportsPage() {
  const supabase = await createClient();
  const [resR, propR, expR] = await Promise.all([
    readAll(() => supabase
      .from("reservations")
      .select(`*, property:properties(name, color_hex), guest:guests(name, country, phone)`)
      .order("check_in").order("id"), "las reservas"),
    readAll(() => supabase.from("properties").select("*").order("name").order("id"), "las propiedades"),
    readAll(() => supabase.from("expenses").select(`*, property:properties(name)`).order("date").order("id"), "los gastos"),
  ]);

  return (
    <div>
      <PageHeader title="Reportes" description="Generación de reportes para descarga" />
      <ReportsClient
        reservations={resR.data ?? []}
        properties={propR.data ?? []}
        expenses={expR.data ?? []}
      />
    </div>
  );
}
