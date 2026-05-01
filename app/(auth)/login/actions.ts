"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email y contraseña son requeridos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciales inválidas" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sesión inválida" };
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const target = roleRow?.role === "caretaker" ? "/agenda" : "/dashboard";
  redirect(target);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
