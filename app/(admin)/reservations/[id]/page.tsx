import { PaymentLedger } from "../payment-ledger";
import { AuditHistory } from "@/components/audit-history";
import { createClient } from "@/lib/supabase/server";
import { readAll } from "@/lib/queries/read-all";
import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getReservation, listGuests, listProperties } from "@/lib/queries/reservations";
import { ReservationForm } from "../reservation-form";
import { StatusBadge, PaidBadge } from "@/components/status-badge";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { SendConfirmationButton } from "./send-confirmation-button";
import Link from "next/link";

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
  const db=await createClient();
  const [payments,history,sync]=await Promise.all([
    readAll(()=>db.from('reservation_payments').select('*').eq('reservation_id',id).order('created_at').order('id'),'los movimientos'),
    readAll(()=>db.from('audit_events').select('*').eq('entity_type','reservations').eq('entity_id',id).order('occurred_at',{ascending:false}).order('id'),'el historial'),
    db.from('notion_sync_jobs').select('state').eq('reservation_id',id).maybeSingle(),
  ]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={`Reserva · ${r.guest?.name ?? "Sin huésped"}`}
        description={`${formatDateLong(r.check_in)} → ${formatDateLong(r.check_out)}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline"><Link href="/integrations">Notion: {sync.error?'estado no disponible':sync.data?.state==='synced'?'sincronizado':sync.data?.state==='processing'?'en curso':sync.data?.state==='review_required'?'requiere revisión':'pendiente'}</Link></Button>
        <SendConfirmationButton
          guestName={r.guest?.name ?? ""}
          guestPhone={r.guest?.phone ?? null}
          totalAmount={r.total_amount_ars}
          propertyId={r.property_id}
          propertyName={r.property?.name ?? ""}
        />
        {/* Descarga directa: el PDF se arma en el server (route handler), así
            que alcanza con un <a download> y no suma nada al bundle. */}
        <Button asChild variant="outline">
          <a href={`/reservations/${r.id}/recibo`} download>
            <FileDown aria-hidden />
            Descargar comprobante
          </a>
        </Button>
      </div>

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

      <ReservationForm key={`${r.id}:${r.version}`}
        properties={properties}
        guests={guests}
        defaults={{
          id: r.id,
          expected_version: r.version,
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
          bed_setup: r.bed_setup,
          notes: r.notes ?? "",
        }}
        mode="edit"
      />

      <PaymentLedger reservationId={r.id} version={r.version} payments={payments.data} balance={r.total_amount_ars-r.amount_paid_ars} paid={r.amount_paid_ars} cancelled={r.status==='cancelled'} />
      <AuditHistory events={history.data} />
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
