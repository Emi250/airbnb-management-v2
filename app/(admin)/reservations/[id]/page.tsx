import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getReservation, listGuests, listProperties } from "@/lib/queries/reservations";
import { ReservationForm } from "../reservation-form";
import { StatusBadge, PaidBadge } from "@/components/status-badge";
import { formatCurrency, formatDateLong } from "@/lib/format";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [r, properties, guests] = await Promise.all([
    getReservation(id),
    listProperties(),
    listGuests(),
  ]);
  if (!r) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Reserva · ${r.guest?.name ?? "Sin huésped"}`}
        description={`${formatDateLong(r.check_in)} → ${formatDateLong(r.check_out)}`}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Tile label="Estado">
          <StatusBadge status={r.status} />
        </Tile>
        <Tile label="Pago">
          <PaidBadge paid={r.amount_paid_ars} total={r.total_amount_ars} />
        </Tile>
        <Tile label="Total">
          <span className="numeric font-semibold">{formatCurrency(r.total_amount_ars)}</span>
        </Tile>
        <Tile label="Saldo">
          <span className="numeric font-semibold">
            {formatCurrency(r.total_amount_ars - r.amount_paid_ars)}
          </span>
        </Tile>
      </div>

      <ReservationForm
        properties={properties}
        guests={guests}
        defaults={{
          id: r.id,
          property_id: r.property_id,
          guest_id: r.guest_id,
          check_in: r.check_in,
          check_out: r.check_out,
          num_guests: r.num_guests,
          total_amount_ars: r.total_amount_ars,
          amount_paid_ars: r.amount_paid_ars,
          source: r.source,
          platform_fee_ars: r.platform_fee_ars ?? 0,
          cleaning_fee_ars: r.cleaning_fee_ars ?? 0,
          status: r.status,
          notes: r.notes ?? "",
        }}
        mode="edit"
      />

      <div className="mt-8 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <p>Creada: {formatDateLong(r.created_at)}</p>
        <p>Última modificación: {formatDateLong(r.updated_at)}</p>
      </div>
    </div>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
