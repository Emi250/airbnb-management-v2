import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/login");
  const isPublic = pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/api/health");

  // Not logged in: redirect everything except auth pages to /login
  if (!user && !isAuthPage && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in: enforce role-based routing
  if (user) {
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const role = roleRow?.role ?? null;

    // Already on login? bounce to the right home
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = role === "caretaker" ? "/agenda" : "/dashboard";
      return NextResponse.redirect(url);
    }

    // Caretaker can only see /agenda
    if (role === "caretaker" && !pathname.startsWith("/agenda")) {
      const url = request.nextUrl.clone();
      url.pathname = "/agenda";
      return NextResponse.redirect(url);
    }

    // Admin should not land on /agenda by default but is allowed to view it
    if (role === "admin" && pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // No role assigned → kick to login
    if (!role && !isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "no_role");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
