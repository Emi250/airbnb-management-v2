import { createClient } from "@/lib/supabase/server";

export type ReservationWithRefs = {
  id: string;
  property_id: string;
  guest_id: string | null;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_amount_ars: number;
  amount_paid_ars: number;
  source: "airbnb" | "booking" | "direct" | "other";
  platform_fee_ars: number | null;
  cleaning_fee_ars: number | null;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  notes: string | null;
  nights: number;
  created_at: string;
  updated_at: string;
  property: { id: string; name: string; color_hex: string | null } | null;
  guest: { id: string; name: string; phone: string | null } | null;
};

export async function listReservations(filters?: {
  propertyIds?: string[];
  status?: string;
  source?: string;
  from?: string;
  to?: string;
  search?: string;
  paid?: "paid" | "unpaid" | "partial";
}) {
  const supabase = await createClient();
  let query = supabase
    .from("reservations")
    .select(
      `*, property:properties(id,name,color_hex), guest:guests(id,name,phone)`
    )
    .order("check_in", { ascending: false });

  if (filters?.propertyIds && filters.propertyIds.length > 0) {
    query = query.in("property_id", filters.propertyIds);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status as "confirmed" | "pending" | "cancelled" | "completed");
  }
  if (filters?.source && filters.source !== "all") {
    query = query.eq("source", filters.source as "airbnb" | "booking" | "direct" | "other");
  }
  if (filters?.from) query = query.gte("check_in", filters.from);
  if (filters?.to) query = query.lte("check_out", filters.to);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as unknown as ReservationWithRefs[];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    rows = rows.filter((r) => r.guest?.name?.toLowerCase().includes(s));
  }
  if (filters?.paid === "paid") rows = rows.filter((r) => r.amount_paid_ars >= r.total_amount_ars);
  if (filters?.paid === "unpaid") rows = rows.filter((r) => r.amount_paid_ars === 0);
  if (filters?.paid === "partial")
    rows = rows.filter((r) => r.amount_paid_ars > 0 && r.amount_paid_ars < r.total_amount_ars);

  return rows;
}

export async function getReservation(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(`*, property:properties(*), guest:guests(*)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listProperties() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listGuests() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("guests").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getExchangeRate() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (
    data ?? { id: "", ars_per_usd: 1000, ars_per_eur: 1100, updated_at: new Date().toISOString() }
  );
}
