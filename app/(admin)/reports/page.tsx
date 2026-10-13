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
      <p className="mb-5 text-sm text-muted-foreground">Los ingresos corresponden al mes de llegada. Comisiones y limpieza se contabilizan en Gastos, sin descontarlas otra vez. Los gastos generales se incluyen solo en el total del negocio. Los importes pagados muestran el saldo acumulado de cada reserva, no los cobros del período.</p>
      <ReportsClient
        reservations={resR.data ?? []}
        properties={propR.data ?? []}
        expenses={expR.data ?? []}
      />
    </div>
  );
}
