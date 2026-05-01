import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CaretakerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!roleRow) redirect("/login?error=no_role");
  // Both admin and caretaker may view /agenda
  return <>{children}</>;
}
