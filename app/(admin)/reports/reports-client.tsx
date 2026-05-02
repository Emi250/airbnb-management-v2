"use client";

import { useState } from "react";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { Download } from "lucide-react";
import type { Property } from "@/types/supabase";

type ReservationRow = {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_amount_ars: number;
  amount_paid_ars: number;
  source: string;
  status: string;
  nights: number;
  property: { name: string } | null;
  guest: { name: string } | null;
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
  const today = new Date();
  const [month, setMonth] = useState(today.toISOString().slice(0, 7));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [propertyId, setPropertyId] = useState<string>("all");

  function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function monthlyByProperty() {
    const [y, m] = month.split("-").map(Number);
    const from = startOfMonth(new Date(y, m - 1, 1));
    const to = endOfMonth(from);
    const filtered = reservations.filter((r) => {
      if (r.status === "cancelled") return false;
      const ci = parseISO(r.check_in);
      if (ci < from || ci > to) return false;
      if (propertyId !== "all" && r.property_id !== propertyId) return false;
      return true;
    });
    const rows: (string | number)[][] = filtered.map((r) => [
      r.property?.name ?? "",
      r.guest?.name ?? "",
      r.check_in,
      r.check_out,
      r.nights,
      r.num_guests,
      r.total_amount_ars,
      r.amount_paid_ars,
      r.source,
      r.status,
    ]);
    downloadCsv(
      `reporte-mensual-${month}.csv`,
      [
        "Propiedad",
        "Huésped",
        "Check-in",
        "Check-out",
        "Noches",
        "Huéspedes",
        "Total ARS",
        "Pagado ARS",
        "Canal",
        "Estado",
      ],
      rows
    );
  }

  function consolidatedRevenue() {
    const filtered = reservations.filter((r) => r.status !== "cancelled");
    const rows: (string | number)[][] = properties.map((p) => {
      const list = filtered.filter((r) => r.property_id === p.id);
      const ytdRevenue = list.reduce((acc, r) => acc + Number(r.total_amount_ars), 0);
      const ytdPaid = list.reduce((acc, r) => acc + Number(r.amount_paid_ars), 0);
      return [
        p.name,
        list.length,
        ytdRevenue,
        ytdPaid,
        ytdRevenue - ytdPaid,
      ];
    });
    downloadCsv(
      `reporte-consolidado-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Propiedad", "Reservas", "Total ARS", "Pagado ARS", "Saldo ARS"],
      rows
    );
  }

  function annualTax() {
    const y = Number(year);
    const from = startOfYear(new Date(y, 0, 1));
    const to = endOfYear(new Date(y, 0, 1));
    const r = reservations.filter((rv) => {
      if (rv.status === "cancelled") return false;
      const ci = parseISO(rv.check_in);
      return ci >= from && ci <= to;
    });
    const e = expenses.filter((ex) => {
      const d = parseISO(ex.date);
      return d >= from && d <= to;
    });

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
    ];
    downloadCsv(`reporte-fiscal-${y}.csv`, [], rows);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Reporte mensual por propiedad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mes</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Propiedad</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={monthlyByProperty}>
            <Download className="h-4 w-4" />
            Descargar CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reporte consolidado de ingresos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Totales por propiedad de todo el período disponible.
          </p>
          <Button className="w-full" onClick={consolidatedRevenue}>
            <Download className="h-4 w-4" />
            Descargar CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reporte fiscal anual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Año</Label>
            <Input
              type="number"
              min={2020}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={annualTax}>
            <Download className="h-4 w-4" />
            Descargar CSV
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Vista previa · ingresos del mes seleccionado</CardTitle>
        </CardHeader>
        <CardContent>
          <PreviewMonthly reservations={reservations} month={month} propertyId={propertyId} />
        </CardContent>
      </Card>
    </div>
  );
}

function PreviewMonthly({
  reservations,
  month,
  propertyId,
}: {
  reservations: ReservationRow[];
  month: string;
  propertyId: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const from = startOfMonth(new Date(y, m - 1, 1));
  const to = endOfMonth(from);
  const filtered = reservations.filter((r) => {
    if (r.status === "cancelled") return false;
    const ci = parseISO(r.check_in);
    if (ci < from || ci > to) return false;
    if (propertyId !== "all" && r.property_id !== propertyId) return false;
    return true;
  });
  const total = filtered.reduce((acc, r) => acc + Number(r.total_amount_ars), 0);

  if (filtered.length === 0) return <p className="text-sm text-muted-foreground">Sin reservas para ese filtro.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {filtered.length} reservas · Total {formatCurrency(total)}
      </p>
      <ul className="text-sm space-y-1 text-muted-foreground">
        {filtered.map((r) => (
          <li key={r.id}>
            {formatDateShort(r.check_in)} → {formatDateShort(r.check_out)} · {r.property?.name} ·{" "}
            {r.guest?.name ?? "—"} · {formatCurrency(r.total_amount_ars)}
          </li>
        ))}
      </ul>
    </div>
  );
}
