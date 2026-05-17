"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Calculator,
  Download,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/reservation-options";
import type {
  Property,
  ReservationSource,
  ReservationStatus,
} from "@/types/supabase";
import {
  ReportsFilters,
  type ReportsFiltersState,
} from "./reports-filters";
import { ReportsKpis, type KpiSummary } from "./reports-kpis";
import { ReportsTrendChart } from "./reports-trend-chart";
import {
  daysInRange,
  defaultRange,
  downloadCsv,
  overlapNights,
} from "./reports-utils";

type ReservationRow = {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_amount_ars: number;
  amount_paid_ars: number;
  source: ReservationSource;
  status: ReservationStatus;
  nights: number;
  property: { name: string; color_hex: string | null } | null;
  guest: { name: string; country: string | null; phone: string | null } | null;
};

type ExpenseRow = {
  id: string;
  property_id: string | null;
  date: string;
  category: string;
  amount_ars: number;
  description: string | null;
  property: { name: string } | null;
};

export function ReportsClient({
  reservations,
  properties,
  expenses,
}: {
  reservations: ReservationRow[];
  properties: Property[];
  expenses: ExpenseRow[];
}) {
  const [filters, setFilters] = useState<ReportsFiltersState>(() => {
    const r = defaultRange();
    return { from: r.from, to: r.to, propertyIds: [] };
  });

  const filteredProperties = useMemo(
    () =>
      filters.propertyIds.length === 0
        ? properties
        : properties.filter((p) => filters.propertyIds.includes(p.id)),
    [properties, filters.propertyIds]
  );

  const filteredReservations = useMemo(
    () =>
      reservations.filter((r) => {
        if (r.status === "cancelled") return false;
        if (
          filters.propertyIds.length > 0 &&
          !filters.propertyIds.includes(r.property_id)
        )
          return false;
        return r.check_in >= filters.from && r.check_in <= filters.to;
      }),
    [reservations, filters]
  );

  const summary: KpiSummary = useMemo(() => {
    const totalRevenue = filteredReservations.reduce(
      (a, r) => a + Number(r.total_amount_ars),
      0
    );
    const paid = filteredReservations.reduce(
      (a, r) => a + Number(r.amount_paid_ars),
      0
    );
    const pending = Math.max(0, totalRevenue - paid);

    const occupiedNights = filteredReservations.reduce(
      (a, r) =>
        a + overlapNights(r.check_in, r.check_out, filters.from, filters.to),
      0
    );
    const days = daysInRange(filters.from, filters.to);
    const availableNights = days * filteredProperties.length;

    return {
      reservationCount: filteredReservations.length,
      totalRevenue,
      paid,
      pending,
      occupiedNights,
      availableNights,
    };
  }, [filteredReservations, filteredProperties.length, filters.from, filters.to]);

  // Reservas con saldo a cobrar — mismo predicado que usa exportPending.
  const pendingCount = useMemo(
    () =>
      filteredReservations.filter(
        (r) => Number(r.total_amount_ars) - Number(r.amount_paid_ars) > 0
      ).length,
    [filteredReservations]
  );

  const rangeSlug = `${filters.from}_${filters.to}`;

  // ---------- exports ----------
  function exportReservations() {
    downloadCsv(
      `reservas-detalladas-${rangeSlug}.csv`,
      [
        "Propiedad",
        "Huésped",
        "Check-in",
        "Check-out",
        "Noches",
        "Huéspedes",
        "Total ARS",
        "Pagado ARS",
        "Saldo ARS",
        "Canal",
        "Estado",
      ],
      filteredReservations.map((r) => [
        r.property?.name ?? "",
        r.guest?.name ?? "",
        r.check_in,
        r.check_out,
        r.nights,
        r.num_guests,
        r.total_amount_ars,
        r.amount_paid_ars,
        Number(r.total_amount_ars) - Number(r.amount_paid_ars),
        SOURCE_LABEL[r.source] ?? r.source,
        STATUS_LABEL[r.status] ?? r.status,
      ])
    );
  }

  function exportGuestList() {
    const rows = filteredReservations
      .slice()
      .sort((a, b) => a.check_in.localeCompare(b.check_in))
      .map((r) => [
        r.check_in,
        r.check_out,
        r.guest?.name ?? "",
        r.guest?.country ?? "",
        r.guest?.phone ?? "",
        r.num_guests,
        r.property?.name ?? "",
      ]);
    downloadCsv(
      `lista-huespedes-${rangeSlug}.csv`,
      [
        "Check-in",
        "Check-out",
        "Nombre",
        "País",
        "Teléfono",
        "Huéspedes",
        "Propiedad",
      ],
      rows
    );
  }

  function exportConsolidated() {
    const rows = properties
      .filter(
        (p) =>
          filters.propertyIds.length === 0 || filters.propertyIds.includes(p.id)
      )
      .map((p) => {
        const list = filteredReservations.filter((r) => r.property_id === p.id);
        const revenue = list.reduce(
          (a, r) => a + Number(r.total_amount_ars),
          0
        );
        const paid = list.reduce((a, r) => a + Number(r.amount_paid_ars), 0);
        return [p.name, list.length, revenue, paid, revenue - paid];
      });
    downloadCsv(
      `ingresos-consolidados-${rangeSlug}.csv`,
      ["Propiedad", "Reservas", "Total ARS", "Pagado ARS", "Saldo ARS"],
      rows
    );
  }

  function exportBySource() {
    const totals = new Map<ReservationSource, { count: number; total: number }>();
    for (const r of filteredReservations) {
      const t = totals.get(r.source) ?? { count: 0, total: 0 };
      t.count += 1;
      t.total += Number(r.total_amount_ars);
      totals.set(r.source, t);
    }
    const grand = Array.from(totals.values()).reduce(
      (a, v) => a + v.total,
      0
    );
    const rows = Array.from(totals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([src, v]) => [
        SOURCE_LABEL[src] ?? src,
        v.count,
        v.total,
        grand > 0 ? (v.total / grand) * 100 : 0,
      ]);
    downloadCsv(
      `ingresos-por-canal-${rangeSlug}.csv`,
      ["Canal", "Reservas", "Total ARS", "% del total"],
      rows.map((r) => [
        r[0],
        r[1],
        r[2],
        Number(r[3]).toFixed(2),
      ])
    );
  }

  function exportOccupancy() {
    const days = daysInRange(filters.from, filters.to);
    const props =
      filters.propertyIds.length === 0
        ? properties
        : properties.filter((p) => filters.propertyIds.includes(p.id));
    const rows = props.map((p) => {
      const list = filteredReservations.filter((r) => r.property_id === p.id);
      const occupied = list.reduce(
        (a, r) =>
          a + overlapNights(r.check_in, r.check_out, filters.from, filters.to),
        0
      );
      const revenue = list.reduce(
        (a, r) => a + Number(r.total_amount_ars),
        0
      );
      const occRate = days > 0 ? (occupied / days) * 100 : 0;
      const adr = occupied > 0 ? revenue / occupied : 0;
      return [
        p.name,
        occupied,
        days,
        occRate.toFixed(2),
        adr.toFixed(2),
        revenue,
      ];
    });
    downloadCsv(
      `ocupacion-${rangeSlug}.csv`,
      [
        "Propiedad",
        "Noches ocupadas",
        "Noches del rango",
        "% Ocupación",
        "ADR ARS",
        "Ingresos ARS",
      ],
      rows
    );
  }

  function exportPending() {
    const rows = filteredReservations
      .filter((r) => Number(r.total_amount_ars) - Number(r.amount_paid_ars) > 0)
      .sort((a, b) => a.check_out.localeCompare(b.check_out))
      .map((r) => [
        r.property?.name ?? "",
        r.guest?.name ?? "",
        r.guest?.phone ?? "",
        r.check_out,
        r.total_amount_ars,
        r.amount_paid_ars,
        Number(r.total_amount_ars) - Number(r.amount_paid_ars),
      ]);
    downloadCsv(
      `saldos-pendientes-${rangeSlug}.csv`,
      [
        "Propiedad",
        "Huésped",
        "Teléfono",
        "Check-out",
        "Total ARS",
        "Pagado ARS",
        "Saldo ARS",
      ],
      rows
    );
  }

  function exportFiscal() {
    // Income & expenses constrained by date range, ignoring property filter for
    // a full fiscal picture (matches what an accountant expects).
    const r = reservations.filter(
      (rv) =>
        rv.status !== "cancelled" &&
        rv.check_in >= filters.from &&
        rv.check_in <= filters.to
    );
    const e = expenses.filter(
      (ex) => ex.date >= filters.from && ex.date <= filters.to
    );

    const rows: (string | number)[][] = [
      ["INGRESOS POR RESERVAS"],
      ["Propiedad", "Huésped", "Check-in", "Check-out", "Total ARS"],
      ...r.map((rv) => [
        rv.property?.name ?? "",
        rv.guest?.name ?? "",
        rv.check_in,
        rv.check_out,
        rv.total_amount_ars,
      ]),
      [""],
      ["GASTOS"],
      ["Fecha", "Propiedad", "Categoría", "Descripción", "Importe ARS"],
      ...e.map((ex) => [
        ex.date,
        ex.property?.name ?? "General",
        ex.category,
        ex.description ?? "",
        ex.amount_ars,
      ]),
      [""],
      ["RESUMEN"],
      ["Total ingresos", r.reduce((a, b) => a + Number(b.total_amount_ars), 0)],
      ["Total gastos", e.reduce((a, b) => a + Number(b.amount_ars), 0)],
      [
        "Resultado",
        r.reduce((a, b) => a + Number(b.total_amount_ars), 0) -
          e.reduce((a, b) => a + Number(b.amount_ars), 0),
      ],
    ];
    downloadCsv(`reporte-fiscal-${rangeSlug}.csv`, [], rows);
  }

  // Tarjetas de exportación agrupadas por uso.
  const operativos: ReportCardSpec[] = [
    {
      key: "guests",
      icon: Users,
      title: "Lista de huéspedes",
      description:
        "Check-in, check-out, nombre, país y teléfono — ideal para coordinación y comunicación.",
      action: exportGuestList,
      highlight: true,
    },
    {
      key: "reservations",
      icon: Receipt,
      title: "Reservas detalladas",
      description:
        "Todas las reservas del rango con totales, pagos, canal y estado.",
      action: exportReservations,
    },
    {
      key: "pending",
      icon: AlertCircle,
      title: "Saldos pendientes",
      description: "Reservas con saldo a cobrar — ordenadas por check-out.",
      action: exportPending,
      tone: "warning",
    },
    {
      key: "occupancy",
      icon: Wallet,
      title: "Ocupación y ADR",
      description: "Noches ocupadas, % ocupación y tarifa promedio diaria.",
      action: exportOccupancy,
    },
  ];

  const contables: ReportCardSpec[] = [
    {
      key: "consolidated",
      icon: BarChart3,
      title: "Ingresos por propiedad",
      description: "Totales del período agrupados por propiedad.",
      action: exportConsolidated,
    },
    {
      key: "source",
      icon: TrendingUp,
      title: "Ingresos por canal",
      description: "Reservas y revenue por canal (Airbnb, Booking, Directo, Otro).",
      action: exportBySource,
    },
    {
      key: "fiscal",
      icon: Calculator,
      title: "Reporte fiscal",
      description:
        "Ingresos y gastos del período con resumen de resultado.",
      action: exportFiscal,
    },
  ];

  return (
    <div className="space-y-6">
      <ReportsFilters
        properties={properties}
        value={filters}
        onChange={setFilters}
      />

      {/* Pagos pendientes — al frente, sólo si hay saldo a cobrar. */}
      {summary.pending > 0 ? (
        <Card className="border-2 border-warning/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <AlertCircle className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Pagos pendientes
                </p>
                <p className="text-sm text-muted-foreground">
                  {pendingCount}{" "}
                  {pendingCount === 1
                    ? "reserva con saldo a cobrar"
                    : "reservas con saldo a cobrar"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <p className="numeric text-3xl font-semibold sm:text-4xl">
                {formatCurrency(summary.pending)}
              </p>
              <Button type="button" variant="outline" onClick={exportPending}>
                <Download className="h-4 w-4" />
                Descargar saldos
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ReportsKpis summary={summary} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Ingresos · últimos 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReportsTrendChart
            reservations={reservations}
            properties={filteredProperties}
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Reportes operativos
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {operativos.map((card) => (
              <ReportCard key={card.key} spec={card} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Reportes contables
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contables.map((card) => (
              <ReportCard key={card.key} spec={card} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type ReportCardSpec = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: () => void;
  highlight?: boolean;
  tone?: "warning";
};

function ReportCard({ spec }: { spec: ReportCardSpec }) {
  const Icon = spec.icon;
  const iconBg =
    spec.tone === "warning"
      ? "bg-warning/10 text-warning"
      : spec.highlight
        ? "bg-primary/10 text-primary"
        : "bg-secondary text-muted-foreground";
  return (
    <Card
      className={`flex flex-col transition-shadow hover:shadow-sm ${
        spec.highlight ? "border-primary/40" : ""
      }`}
    >
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold leading-tight">
              {spec.title}
            </h3>
            <p className="text-xs leading-snug text-muted-foreground">
              {spec.description}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={spec.highlight ? "default" : "outline"}
          size="sm"
          className="mt-auto w-full"
          onClick={spec.action}
        >
          <Download className="h-4 w-4" />
          Descargar CSV
        </Button>
      </CardContent>
    </Card>
  );
}
