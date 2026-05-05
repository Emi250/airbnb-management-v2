import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleRow) redirect("/login?error=no_role");
  if (roleRow.role !== "admin" && roleRow.role !== "manager") redirect("/agenda");

  return (
    <AdminShell
      displayName={roleRow.display_name ?? user.email ?? "Usuario"}
      role={roleRow.role}
    >
      {children}
    </AdminShell>
  );
}
