"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { OccupancyBarChart } from "@/components/charts/occupancy-bar";
import {
  DepartmentBreakdownList,
  type DepartmentBreakdownRow,
} from "@/components/dashboard/department-breakdown-list";
import { type Currency } from "@/lib/format";
import type { ExchangeRate, Property } from "@/types/supabase";

export type AnalisisSectionProps = {
  occupancy: {
    data: Array<Record<string, string | number>>;
    properties: Property[];
  };
  /** Una fila por departamento: ingresos YTD + ocupación YTD. */
  breakdown: DepartmentBreakdownRow[];
  currency: Currency;
  rate: ExchangeRate;
};

export function AnalisisSection({
  occupancy,
  breakdown,
  currency,
  rate,
}: AnalisisSectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeading title="Análisis por departamento" />

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
              Ingresos por departamento (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DepartmentBreakdownList
              rows={breakdown}
              currency={currency}
              rate={rate}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
