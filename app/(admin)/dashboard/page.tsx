import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [resR, propR, expR, targetsR, rateR] = await Promise.all([
    supabase.from("reservations").select("*").order("check_in", { ascending: true }),
    supabase.from("properties").select("*").order("name"),
    supabase.from("expenses").select("*").order("date", { ascending: true }),
    supabase.from("monthly_targets").select("*"),
    supabase
      .from("exchange_rates")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

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
            ars_per_usd: 1000,
            ars_per_eur: 1100,
            updated_at: new Date().toISOString(),
          }
        }
      />
    </div>
  );
}
