import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listProperties } from "@/lib/queries/reservations";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { startOfYear } from "date-fns";
import { sumRevenue } from "@/lib/analytics";

export default async function PropertiesPage() {
  const properties = await listProperties();
  const supabase = await createClient();
  const { data: reservations } = await supabase.from("reservations").select("*");

  return (
    <div>
      <PageHeader title="Propiedades" description="Detalle por propiedad" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => {
          const ytd = sumRevenue(
            (reservations ?? []).filter((r) => r.property_id === p.id),
            startOfYear(new Date()),
            new Date()
          );
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
                      <p className="truncate text-xs text-muted-foreground">{p.address ?? "—"}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Precio base</p>
                      <p className="numeric font-medium">{formatCurrency(Number(p.base_price_ars ?? 0))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ingresos YTD</p>
                      <p className="numeric font-medium">{formatCurrency(ytd)}</p>
                    </div>
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
