import { createClient } from "@/lib/supabase/server";

export async function ensureDashboardAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data?.role !== "admin") {
    throw new Error("Acceso restringido");
  }
  return supabase;
}
