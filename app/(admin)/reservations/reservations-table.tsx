"use client";

import Link from "next/link";
import { Download } from "lucide-react";
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
import { formatCurrency, formatDateShort } from "@/lib/format";
import type { ReservationWithRefs } from "@/lib/queries/reservations";

export function ReservationsTable({ rows }: { rows: ReservationWithRefs[] }) {
  function exportCsv() {
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

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Propiedad</TableHead>
            <TableHead>Huésped</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead className="text-right">Noches</TableHead>
            <TableHead className="text-right">Huéspedes</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Canal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link
                  href={`/reservations/${r.id}`}
                  className="inline-flex items-center gap-2 font-medium hover:underline"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: r.property?.color_hex ?? "#A47148" }}
                  />
                  {r.property?.name}
                </Link>
              </TableCell>
              <TableCell>{r.guest?.name ?? "—"}</TableCell>
              <TableCell>{formatDateShort(r.check_in)}</TableCell>
              <TableCell>{formatDateShort(r.check_out)}</TableCell>
              <TableCell className="numeric text-right">{r.nights}</TableCell>
              <TableCell className="numeric text-right">{r.num_guests}</TableCell>
              <TableCell className="numeric text-right">
                {formatCurrency(r.total_amount_ars)}
              </TableCell>
              <TableCell className="numeric text-right">
                {formatCurrency(r.total_amount_ars - r.amount_paid_ars)}
              </TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell>
                <PaidBadge paid={r.amount_paid_ars} total={r.total_amount_ars} />
              </TableCell>
              <TableCell className="capitalize">{r.source}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
