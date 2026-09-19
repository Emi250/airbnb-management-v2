import type {
  ReservationStatus,
  ReservationSource,
  ExpenseCategory,
  BedSetup,
} from "@/types/supabase";

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  cancelled: "Cancelada",
  completed: "Completada",
};

export const STATUS_LABEL_PLURAL: Record<ReservationStatus, string> = {
  confirmed: "Confirmadas",
  pending: "Pendientes",
  cancelled: "Canceladas",
  completed: "Completadas",
};

export const SOURCE_LABEL: Record<ReservationSource, string> = {
  airbnb: "Airbnb",
  booking: "Booking",
  direct: "Directo",
  other: "Otro",
};

// La etiqueta corta para Notion vive en lib/notion/reservations.ts: ese módulo
// no puede importar este archivo (usa el alias @/) porque corre también fuera
// del bundler, desde scripts/backfill-notion.ts.
export const BED_SETUP_LABEL: Record<BedSetup, string> = {
  together: "Cama matrimonial",
  separate: "Camas separadas",
};

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  cleaning: "Limpieza",
  maintenance: "Mantenimiento",
  utilities: "Servicios",
  supplies: "Insumos",
  tax: "Impuestos",
  other: "Otro",
  fixed: "Gasto Fijo",
};
