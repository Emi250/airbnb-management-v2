"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

export type CalendarProps = DayPickerProps;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = es,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn(
        "p-3 [--rdp-cell-size:36px] [--rdp-accent-color:var(--primary)] [--rdp-accent-background-color:color-mix(in_oklch,var(--primary)_20%,transparent)] [--rdp-day_button-border-radius:8px] [--rdp-selected-border:2px_solid_var(--primary)]",
        className
      )}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-3",
        month_caption:
          "relative flex h-8 items-center justify-center text-sm font-medium tracking-tight",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-1 top-0 flex items-center justify-between",
        button_previous:
          "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30",
        button_next:
          "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30",
        weekdays: "grid grid-cols-7",
        weekday:
          "h-8 w-9 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
        week: "mt-1 grid grid-cols-7",
        day: "relative size-9 p-0 text-center text-sm",
        day_button:
          "inline-flex size-9 items-center justify-center rounded-md font-normal tabular-nums transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        today: "bg-muted/60 font-semibold",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        outside: "text-muted-foreground/60",
        disabled: "cursor-not-allowed text-muted-foreground/50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";
