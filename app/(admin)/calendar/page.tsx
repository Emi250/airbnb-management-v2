import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { listProperties, listReservations } from "@/lib/queries/reservations";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: roleRow } = user
    ? await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const canWrite = roleRow?.role === "admin";

  const [properties, reservations] = await Promise.all([
    listProperties(),
    listReservations(),
  ]);

  // Anchor "today" on the server to avoid SSR/CSR hydration mismatch
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div>
      <PageHeader title="Calendario" description="Vista cronológica multi-propiedad" />
      <CalendarView
        properties={properties}
        reservations={reservations}
        today={today}
        canWrite={canWrite}
      />
    </div>
  );
}
