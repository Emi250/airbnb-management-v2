import Link from "next/link";
import { Plus, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { listReservations, listProperties } from "@/lib/queries/reservations";
import {
  ReservationsTable,
  ExportReservationsButton,
} from "./reservations-table";
import { ReservationsFilters } from "./reservations-filters";
import { EmptyState } from "@/components/empty-state";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string;
    status?: string;
    source?: string;
    paid?: "paid" | "unpaid" | "partial";
    from?: string;
    to?: string;
    q?: string;
  }>;
}) {
  const sp = await searchParams;
  const propertyIds = sp.property ? sp.property.split(",").filter(Boolean) : [];

  const [rows, properties] = await Promise.all([
    listReservations({
      propertyIds,
      status: sp.status,
      source: sp.source,
      from: sp.from,
      to: sp.to,
      search: sp.q,
      paid: sp.paid,
    }),
    listProperties(),
  ]);

  return (
    <div>
      <PageHeader
        title="Reservas"
        description={`${rows.length} reservas con los filtros aplicados`}
        actions={
          <>
            <ExportReservationsButton rows={rows} />
            <Button asChild>
              <Link href="/reservations/new">
                <Plus className="h-4 w-4" />
                Nueva reserva
              </Link>
            </Button>
          </>
        }
      />

      <ReservationsFilters properties={properties} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" />}
          title="No hay reservas con esos filtros"
          description="Probá ampliar el rango o limpiar los filtros."
          ctaLabel="Nueva reserva"
          ctaHref="/reservations/new"
        />
      ) : (
        <ReservationsTable rows={rows} />
      )}
    </div>
  );
}
