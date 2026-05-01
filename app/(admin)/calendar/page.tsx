import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { listProperties, listReservations } from "@/lib/queries/reservations";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const [properties, reservations] = await Promise.all([
    listProperties(),
    listReservations(),
  ]);

  // Anchor "today" on the server to avoid SSR/CSR hydration mismatch
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div>
      <PageHeader title="Calendario" description="Vista cronológica multi-propiedad" />
      <CalendarView properties={properties} reservations={reservations} today={today} />
    </div>
  );
}
