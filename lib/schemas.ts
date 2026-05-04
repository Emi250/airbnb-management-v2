import { z } from "zod";

export const reservationSchema = z
  .object({
    property_id: z.string().uuid({ message: "Seleccione una propiedad" }),
    guest_id: z.string().uuid().nullable().optional(),
    new_guest_name: z.string().optional(),
    new_guest_phone: z.string().optional(),
    new_guest_email: z.string().email("Email inválido").or(z.literal("")).optional(),
    new_guest_country: z.string().optional(),
    check_in: z.string().min(1, "Check-in requerido"),
    check_out: z.string().min(1, "Check-out requerido"),
    num_guests: z.coerce.number().int().min(1, "Al menos 1 huésped"),
    total_amount_ars: z.coerce.number().min(0),
    amount_paid_ars: z.coerce.number().min(0),
    source: z.enum(["airbnb", "booking", "direct", "other"]),
    platform_fee_ars: z.coerce.number().min(0).default(0),
    cleaning_fee_ars: z.coerce.number().min(0).default(0),
    status: z.enum(["confirmed", "pending", "cancelled", "completed"]),
    notes: z.string().optional(),
  })
  .refine((d) => new Date(d.check_out) > new Date(d.check_in), {
    message: "Check-out debe ser posterior a check-in",
    path: ["check_out"],
  })
  .refine((d) => d.amount_paid_ars <= d.total_amount_ars, {
    message: "El pago no puede superar el total",
    path: ["amount_paid_ars"],
  })
  .refine((d) => d.guest_id || (d.new_guest_name && d.new_guest_name.length > 0), {
    message: "Seleccione o cree un huésped",
    path: ["guest_id"],
  });

export type ReservationInput = z.infer<typeof reservationSchema>;

export const propertySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  address: z.string().optional(),
  base_price_ars: z.coerce.number().min(0),
  cleaning_fee_ars: z.coerce.number().min(0),
  color_hex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/i, "Color inválido (#RRGGBB)")
    .default("#A47148"),
  active: z.boolean().default(true),
});

export type PropertyInput = z.infer<typeof propertySchema>;

export const guestSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

export type GuestInput = z.infer<typeof guestSchema>;

export const expenseSchema = z.object({
  property_id: z.string().uuid().nullable().optional(),
  date: z.string().min(1, "Fecha requerida"),
  category: z.enum([
    "cleaning",
    "maintenance",
    "utilities",
    "supplies",
    "tax",
    "other",
    "fixed",
  ]),
  amount_ars: z.coerce.number().min(0),
  description: z.string().optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const fixedExpenseItemSchema = z.object({
  label: z.string().min(1, "Nombre requerido").max(80, "Máximo 80 caracteres"),
});

export type FixedExpenseItemInput = z.infer<typeof fixedExpenseItemSchema>;

export const fixedExpenseMarkSchema = z.object({
  item_id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Período inválido"),
  amount_ars: z.coerce.number().min(0, "Importe inválido"),
  property_id: z.string().uuid().nullable().optional(),
});

export type FixedExpenseMarkInput = z.infer<typeof fixedExpenseMarkSchema>;

export const exchangeRateSchema = z.object({
  ars_per_usd: z.coerce.number().min(0),
  ars_per_eur: z.coerce.number().min(0),
});

export type ExchangeRateInput = z.infer<typeof exchangeRateSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
