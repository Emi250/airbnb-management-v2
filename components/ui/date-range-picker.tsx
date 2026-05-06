"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRangePickerProps {
  from?: string;
  to?: string;
  onChange: (range: { from: string; to: string }) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

function parseISO(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

function formatLabel(from?: Date, to?: Date) {
  if (from && to) {
    const sameYear = from.getFullYear() === to.getFullYear();
    const left = format(from, sameYear ? "dd MMM" : "dd MMM yyyy", { locale: es });
    const right = format(to, "dd MMM yyyy", { locale: es });
    return `${left} – ${right}`;
  }
  if (from) return `Desde ${format(from, "dd MMM yyyy", { locale: es })}`;
  if (to) return `Hasta ${format(to, "dd MMM yyyy", { locale: es })}`;
  return null;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Rango de fechas",
  className,
  ariaLabel,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [numberOfMonths, setNumberOfMonths] = React.useState(2);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setNumberOfMonths(mq.matches ? 2 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const fromDate = React.useMemo(() => parseISO(from), [from]);
  const toDate = React.useMemo(() => parseISO(to), [to]);
  const selected: DateRange | undefined =
    fromDate || toDate ? { from: fromDate, to: toDate } : undefined;
  const label = formatLabel(fromDate, toDate);
  const hasValue = Boolean(fromDate || toDate);

  function handleSelect(range: DateRange | undefined) {
    const next = {
      from: range?.from ? format(range.from, "yyyy-MM-dd") : "",
      to: range?.to ? format(range.to, "yyyy-MM-dd") : "",
    };
    onChange(next);
    if (next.from && next.to) setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onChange({ from: "", to: "" });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "h-9 w-full justify-start gap-2 font-normal",
            !label && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
          <span className="truncate flex-1 text-left">{label ?? placeholder}</span>
          {hasValue && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpiar rango de fechas"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClear(e as unknown as React.MouseEvent);
              }}
              className="ml-auto inline-flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={numberOfMonths}
          selected={selected}
          defaultMonth={fromDate ?? toDate ?? new Date()}
          onSelect={handleSelect}
          autoFocus
        />
        <div className="flex items-center justify-end border-t border-border px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ from: "", to: "" })}
            disabled={!hasValue}
          >
            Limpiar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
