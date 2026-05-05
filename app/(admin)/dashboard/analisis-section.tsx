"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { OccupancyBarChart } from "@/components/charts/occupancy-bar";
import { RevenueDonut } from "@/components/charts/revenue-donut";
import { type Currency } from "@/lib/format";
import type { ExchangeRate, Property } from "@/types/supabase";

export type AnalisisSectionProps = {
  occupancy: {
    data: Array<Record<string, string | number>>;
    properties: Property[];
  };
  donut: {
    data: { name: string; value: number; color: string }[];
  };
  currency: Currency;
  rate: ExchangeRate;
};

export function AnalisisSection({ occupancy, donut, currency, rate }: AnalisisSectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeading title="Análisis por propiedad" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Ocupación mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OccupancyBarChart
              data={occupancy.data}
              properties={occupancy.properties}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Ingresos por propiedad (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueDonut data={donut.data} currency={currency} rate={rate} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
