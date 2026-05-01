import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [propR, rateR, usersR] = await Promise.all([
    supabase.from("properties").select("*").order("name"),
    supabase
      .from("exchange_rates")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("user_roles").select("*"),
  ]);
  return (
    <div>
      <PageHeader title="Ajustes" description="Configuración general de la plataforma" />
      <SettingsClient
        properties={propR.data ?? []}
        rate={
          rateR.data ?? {
            id: "",
            ars_per_usd: 1000,
            ars_per_eur: 1100,
            updated_at: new Date().toISOString(),
          }
        }
        users={usersR.data ?? []}
      />
    </div>
  );
}
