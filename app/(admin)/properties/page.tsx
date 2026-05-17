import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listProperties } from "@/lib/queries/reservations";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateShort, formatPercent } from "@/lib/format";
import { startOfYear, startOfMonth, endOfMonth, endOfDay } from "date-fns";
import { sumRevenue, occupancyRate } from "@/lib/analytics";

export default async function PropertiesPage() {
  const properties = await listProperties();
  const supabase = await createClient();
  const { data: reservations } = await supabase.from("reservations").select("*");
  const all = reservations ?? [];

  const now = new Date();
  const yearStart = startOfYear(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const today = endOfDay(now);

  return (
    <div>
      <PageHeader title="Propiedades" description="Detalle por propiedad" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => {
          const propReservations = all.filter((r) => r.property_id === p.id);

          const ytd = sumRevenue(propReservations, yearStart, today);
          const monthRevenue = sumRevenue(propReservations, monthStart, monthEnd);
          const occ = occupancyRate(propReservations, [p], yearStart, today);

          // Próxima reserva: misma lógica que la sección "Próximas reservas"
          // de la página de detalle — reservas activas con check-in futuro.
          const nextReservation = propReservations
            .filter((r) => r.status !== "cancelled" && new Date(r.check_in) >= now)
            .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];

          return (
            <Link key={p.id} href={`/properties/${p.id}`} className="group">
              <Card className="transition-colors hover:bg-secondary/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 shrink-0 rounded-lg"
                      style={{ backgroundColor: p.color_hex ?? "#A47148" }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.address ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Precio base</p>
                      <p className="numeric font-medium">
                        {formatCurrency(Number(p.base_price_ars ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ocupación año</p>
                      <p className="numeric font-medium">{formatPercent(occ)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ingresos mes</p>
                      <p className="numeric font-medium">
                        {formatCurrency(monthRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ingresos YTD</p>
                      <p className="numeric font-medium">{formatCurrency(ytd)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-xs text-muted-foreground">
                      Próxima reserva
                    </span>
                    <span className="numeric font-medium">
                      {nextReservation
                        ? formatDateShort(nextReservation.check_in)
                        : "Sin próximas"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
