import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

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
  if (roleRow.role !== "admin") redirect("/agenda");

  return (
    <div className="flex min-h-screen">
      <Sidebar displayName={roleRow.display_name ?? user.email ?? "Usuario"} />
      <main className="flex-1 min-w-0">
        <div className="px-4 py-6 md:px-8 md:py-8 pt-16 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
