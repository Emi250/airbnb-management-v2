import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";
import { readAll, checkQueryErrors } from "@/lib/queries/read-all";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [propR, rateR, usersR] = await Promise.all([
    readAll(() => supabase.from("properties").select("*").order("name").order("id"), "las propiedades"),
    supabase
      .from("exchange_rates")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    readAll(() => supabase.from("user_roles").select("*").order("user_id"), "los usuarios"),
  ]);
  checkQueryErrors([rateR]);
  return (
    <div>
      <PageHeader title="Ajustes" description="Configuración general de la plataforma" />
      <SettingsClient
        properties={propR.data ?? []}
        rate={
          rateR.data ?? {
            id: "",
            ars_per_usd: 0,
            ars_per_eur: 0,
            updated_at: "",
          }
        }
        users={usersR.data ?? []}
      />
    </div>
  );
}
