"use client";

import Link from "next/link";
import { Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, PaidBadge } from "@/components/status-badge";
import { ContactActions } from "@/components/ui/contact-actions";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/reservation-options";
import type { ReservationWithRefs } from "@/lib/queries/reservations";

/** Genera y descarga el CSV de reservas. Mantiene todas las columnas de datos. */
function buildAndDownloadCsv(rows: ReservationWithRefs[]) {
  const header = [
    "Propiedad",
    "Huésped",
    "Check-in",
    "Check-out",
    "Noches",
    "Huéspedes",
    "Total ARS",
    "Pagado ARS",
    "Saldo ARS",
    "Estado",
    "Canal",
    "Teléfono",
  ];
  const lines = rows.map((r) =>
    [
      r.property?.name ?? "",
      r.guest?.name ?? "",
      r.check_in,
      r.check_out,
      r.nights,
      r.num_guests,
      r.total_amount_ars,
      r.amount_paid_ars,
      r.total_amount_ars - r.amount_paid_ars,
      r.status,
      r.source,
      r.guest?.phone ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Botón "Exportar CSV". Se renderiza desde la page en el PageHeader para que
 * la acción sea claramente visible. No depende del montaje de la tabla.
 */
export function ExportReservationsButton({
  rows,
}: {
  rows: ReservationWithRefs[];
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => buildAndDownloadCsv(rows)}
      disabled={rows.length === 0}
    >
      <Download className="h-4 w-4" />
      Exportar CSV
    </Button>
  );
}

export function ReservationsTable({ rows }: { rows: ReservationWithRefs[] }) {
  return (
    <>
      {/* Vista de tabla — desde md hacia arriba. */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Departamento</TableHead>
              <TableHead>Huésped</TableHead>
              <TableHead>Fechas</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="w-[80px] text-right">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const balance = r.total_amount_ars - r.amount_paid_ars;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/reservations/${r.id}`}
                      className="inline-flex items-center gap-2 font-medium hover:underline"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: r.property?.color_hex ?? "#A47148",
                        }}
                      />
                      {r.property?.name}
                    </Link>
                  </TableCell>
                  <TableCell>{r.guest?.name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span>{formatDateShort(r.check_in)}</span>
                    <span className="px-1 text-muted-foreground">→</span>
                    <span>{formatDateShort(r.check_out)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({r.nights} {r.nights === 1 ? "noche" : "noches"})
                    </span>
                  </TableCell>
                  <TableCell className="numeric text-right">
                    <span className="font-medium">
                      {formatCurrency(r.total_amount_ars)}
                    </span>
                    {balance > 0 ? (
                      <span className="block text-xs text-muted-foreground">
                        Saldo {formatCurrency(balance)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <PaidBadge
                      paid={r.amount_paid_ars}
                      total={r.total_amount_ars}
                    />
                  </TableCell>
                  <TableCell>{SOURCE_LABEL[r.source]}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/reservations/${r.id}`}
                        aria-label={`Editar reserva de ${
                          r.guest?.name ?? "huésped"
                        }`}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only lg:not-sr-only">Editar</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Vista de tarjetas apiladas — sólo en mobile. */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => {
          const balance = r.total_amount_ars - r.amount_paid_ars;
          return (
            <li key={r.id}>
              <Link
                href={`/reservations/${r.id}`}
                className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: r.property?.color_hex ?? "#A47148",
                      }}
                    />
                    {r.property?.name}
                  </span>
                  <StatusBadge status={r.status} />
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {r.guest?.name ?? "—"}
                </p>

                <p className="mt-2 text-sm">
                  <span>{formatDateShort(r.check_in)}</span>
                  <span className="px-1 text-muted-foreground">→</span>
                  <span>{formatDateShort(r.check_out)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({r.nights} {r.nights === 1 ? "noche" : "noches"})
                  </span>
                </p>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="numeric text-base font-semibold">
                      {formatCurrency(r.total_amount_ars)}
                    </p>
                    {balance > 0 ? (
                      <p className="numeric text-xs text-muted-foreground">
                        Saldo {formatCurrency(balance)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <PaidBadge
                      paid={r.amount_paid_ars}
                      total={r.total_amount_ars}
                    />
                    <span className="text-xs text-muted-foreground">
                      {SOURCE_LABEL[r.source]}
                    </span>
                  </div>
                </div>
              </Link>

              {r.guest?.phone ? (
                <div className="mt-1 px-1">
                  <ContactActions phone={r.guest.phone} name={r.guest.name} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
