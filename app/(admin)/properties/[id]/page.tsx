import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateShort, formatPercent } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import {
  sumRevenue,
  sumExpenses,
  occupancyRate,
  monthlyRevenueByProperty,
} from "@/lib/analytics";
import { startOfYear, startOfMonth, endOfMonth, endOfDay } from "date-fns";
import { RevenueLineChart } from "@/components/charts/revenue-line";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [propRes, resR, expR, rateR] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("reservations")
      .select(`*, guest:guests(name,phone)`)
      .eq("property_id", id)
      .order("check_in", { ascending: false }),
    supabase.from("expenses").select("*").eq("property_id", id).order("date", { ascending: false }),
    supabase
      .from("exchange_rates")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const property = propRes.data;
  if (!property) notFound();

  const reservations = resR.data ?? [];
  const expenses = expR.data ?? [];
  const rate = rateR.data ?? { id: "", ars_per_usd: 1000, ars_per_eur: 1100, updated_at: "" };

  const now = new Date();
  const ytd = sumRevenue(reservations, startOfYear(now), endOfDay(now));
  const monthRevenue = sumRevenue(reservations, startOfMonth(now), endOfMonth(now));
  const occYtd = occupancyRate(reservations, [property], startOfYear(now), endOfDay(now));
  const totalExpensesYtd = sumExpenses(expenses, startOfYear(now), endOfDay(now));
  const netYtd = ytd - totalExpensesYtd;

  const monthly = monthlyRevenueByProperty(reservations, [property], 12);
  const upcoming = reservations.filter((r) => new Date(r.check_in) >= now && r.status !== "cancelled");
  const past = reservations.filter((r) => new Date(r.check_out) < now);

  return (
    <div>
      <PageHeader
        title={property.name}
        description={property.address ?? "Sin dirección"}
        actions={
          <Button asChild variant="outline">
            <Link href={`/reservations/new?property=${property.id}`}>+ Nueva reserva</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Ingresos mes" value={formatCurrency(monthRevenue)} />
        <Stat label="Ingresos YTD" value={formatCurrency(ytd)} />
        <Stat label="Ocupación YTD" value={formatPercent(occYtd)} />
        <Stat
          label="Margen neto YTD"
          value={formatCurrency(netYtd)}
          accent={netYtd >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ingresos mensuales · 12 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueLineChart data={monthly} properties={[property]} currency="ARS" rate={rate} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas reservas</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin próximas reservas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Huésped</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.slice(0, 10).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDateShort(r.check_in)}</TableCell>
                      <TableCell>{formatDateShort(r.check_out)}</TableCell>
                      <TableCell>
                        <Link href={`/reservations/${r.id}`} className="hover:underline">
                          {r.guest?.name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="numeric text-right">
                        {formatCurrency(r.total_amount_ars)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin gastos cargados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.slice(0, 10).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{formatDateShort(e.date)}</TableCell>
                      <TableCell className="capitalize">{e.category}</TableCell>
                      <TableCell>{e.description ?? "—"}</TableCell>
                      <TableCell className="numeric text-right">
                        {formatCurrency(e.amount_ars)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial completo ({past.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin historial.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Huésped</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {past.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDateShort(r.check_in)}</TableCell>
                    <TableCell>{formatDateShort(r.check_out)}</TableCell>
                    <TableCell>
                      <Link href={`/reservations/${r.id}`} className="hover:underline">
                        {r.guest?.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="numeric text-right">
                      {formatCurrency(r.total_amount_ars)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p
          className={`numeric mt-2 text-2xl font-semibold ${
            accent === "positive" ? "text-emerald-500" : accent === "negative" ? "text-destructive" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
