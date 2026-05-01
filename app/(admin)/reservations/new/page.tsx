import { PageHeader } from "@/components/page-header";
import { listGuests, listProperties } from "@/lib/queries/reservations";
import { ReservationForm } from "../reservation-form";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const [properties, guests] = await Promise.all([listProperties(), listGuests()]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Nueva reserva" description="Cargá los datos de la reserva" />
      <ReservationForm
        properties={properties}
        guests={guests}
        defaults={{ property_id: sp.property, check_in: sp.date }}
        mode="create"
      />
    </div>
  );
}
