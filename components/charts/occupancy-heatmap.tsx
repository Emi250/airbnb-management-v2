"use client";

import { useMemo } from "react";
import { format, parseISO, getDay, startOfYear } from "date-fns";
import { es } from "date-fns/locale";

type Day = { date: string; occupied: number; capacity: number; ratio: number };

export function OccupancyHeatmap({ data }: { data: Day[] }) {
  const { weeks, monthLabels } = useMemo(() => {
    if (data.length === 0) return { weeks: [], monthLabels: [] };

    const yearStart = startOfYear(parseISO(data[0].date));
    const startWeekday = getDay(yearStart);
    const padded: (Day | null)[] = Array(startWeekday).fill(null).concat(data);

    const cols: ((Day | null)[])[] = [];
    for (let i = 0; i < padded.length; i += 7) {
      cols.push(padded.slice(i, i + 7));
    }

    const labels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    cols.forEach((col, idx) => {
      const firstReal = col.find(Boolean);
      if (firstReal) {
        const m = parseISO(firstReal.date).getMonth();
        if (m !== lastMonth) {
          labels.push({ weekIndex: idx, label: format(parseISO(firstReal.date), "MMM", { locale: es }) });
          lastMonth = m;
        }
      }
    });

    return { weeks: cols, monthLabels: labels };
  }, [data]);

  function color(ratio: number) {
    if (ratio === 0) return "var(--secondary)";
    const alpha = 0.25 + ratio * 0.75;
    return `color-mix(in oklab, var(--accent) ${Math.round(alpha * 100)}%, transparent)`;
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="relative ml-6">
          <div className="flex h-4 mb-1">
            {monthLabels.map((m, i) => {
              const next = monthLabels[i + 1];
              const span = (next?.weekIndex ?? weeks.length) - m.weekIndex;
              return (
                <div
                  key={m.label + i}
                  className="text-[10px] uppercase text-muted-foreground"
                  style={{ width: `${span * 14}px`, paddingLeft: 2 }}
                >
                  {m.label}
                </div>
              );
            })}
          </div>
          <div className="flex gap-[2px]">
            {weeks.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[2px]">
                {col.map((d, di) => (
                  <div
                    key={ci + "-" + di}
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: d ? color(d.ratio) : "transparent" }}
                    title={d ? `${d.date} · ${d.occupied}/${d.capacity}` : ""}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Menos</span>
            <span className="h-3 w-3 rounded-sm" style={{ background: "var(--secondary)" }} />
            <span className="h-3 w-3 rounded-sm" style={{ background: color(0.25) }} />
            <span className="h-3 w-3 rounded-sm" style={{ background: color(0.5) }} />
            <span className="h-3 w-3 rounded-sm" style={{ background: color(0.75) }} />
            <span className="h-3 w-3 rounded-sm" style={{ background: color(1) }} />
            <span>Más</span>
          </div>
        </div>
      </div>
    </div>
  );
}
