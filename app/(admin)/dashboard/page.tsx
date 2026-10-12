import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DashboardClient } from "./dashboard-client";
import { readAll, checkQueryErrors } from "@/lib/queries/read-all";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [resR, propR, expR, targetsR, rateR] = await Promise.all([
    readAll(() => supabase.from("reservations").select("*").order("check_in").order("id"), "las reservas"),
    readAll(() => supabase.from("properties").select("*").order("name").order("id"), "las propiedades"),
    readAll(() => supabase.from("expenses").select("*").order("date").order("id"), "los gastos"),
    readAll(() => supabase.from("monthly_targets").select("*").order("id"), "los objetivos"),
    supabase
      .from("exchange_rates")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  checkQueryErrors([rateR]);

  return (
    <div>
      <PageHeader title="Dashboard" />
      <DashboardClient
        reservations={resR.data ?? []}
        properties={propR.data ?? []}
        expenses={expR.data ?? []}
        targets={targetsR.data ?? []}
        rate={
          rateR.data ?? {
            id: "",
            ars_per_usd: 0,
            ars_per_eur: 0,
            updated_at: "",
          }
        }
      />
    </div>
  );
}
