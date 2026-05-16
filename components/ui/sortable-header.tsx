"use client";

import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

/**
 * Celda de cabecera ordenable para una `Table`. Renderiza un `<th>` con un
 * botón a todo el ancho que dispara `onSort`. El ícono refleja el estado:
 * sin orden activo (doble flecha tenue), orden ascendente o descendente.
 */
export function SortableHeader({
  label,
  active,
  direction,
  onSort,
  align = "left",
  className,
}: {
  /** Texto visible de la columna. */
  label: string;
  /** True si esta columna es la que ordena la tabla actualmente. */
  active: boolean;
  /** Dirección actual; sólo relevante cuando `active` es true. */
  direction: SortDirection;
  /** Handler de click: alterna/activa el orden de esta columna. */
  onSort: () => void;
  /** Alineación del contenido; usar "right" para columnas numéricas. */
  align?: "left" | "right";
  className?: string;
}) {
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props */}
      <button
        type="button"
        onClick={onSort}
        aria-label={`Ordenar por ${label}`}
        aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
          active ? "text-foreground" : "text-muted-foreground",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0", !active && "opacity-50")}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}
