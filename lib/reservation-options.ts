import type {
  ReservationStatus,
  ReservationSource,
  ExpenseCategory,
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

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  cleaning: "Limpieza",
  maintenance: "Mantenimiento",
  utilities: "Servicios",
  supplies: "Insumos",
  tax: "Impuestos",
  other: "Otro",
  fixed: "Gasto Fijo",
};
