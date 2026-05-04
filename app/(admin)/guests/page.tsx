import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";
import { GuestsView } from "./guests-view";

export default async function GuestsPage() {
  const supabase = await createClient();
  const [guestsR, resR] = await Promise.all([
    supabase.from("guests").select("*").order("name"),
    supabase
      .from("reservations")
      .select("guest_id, source, total_amount_ars, status, check_in"),
  ]);
  const guests = guestsR.data ?? [];
  const reservations = resR.data ?? [];

  return (
    <div>
      <PageHeader
        title="Huéspedes"
        description={`${guests.length} huéspedes registrados`}
      />
      {guests.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Sin huéspedes registrados"
          description="Los huéspedes se crean al cargar reservas."
        />
      ) : (
        <GuestsView guests={guests} reservations={reservations} />
      )}
    </div>
  );
}
