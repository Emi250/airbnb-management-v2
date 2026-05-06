import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

export async function updateSession(request: NextRequest) {
  // If env vars are missing at runtime, fall through gracefully (deploy-time misconfig).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[middleware] Missing Supabase env vars at runtime");
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
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
  });

  // Wrap the entire auth flow. If anything throws (network, malformed cookie, etc.)
  // let the request through unauthenticated rather than 500.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    const isAuthPage = pathname.startsWith("/login");
    const isPublic =
      pathname === "/" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/health") ||
      pathname.startsWith("/api/cron/");

    // Not logged in: redirect everything except auth/public pages to /login
    if (!user && !isAuthPage && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Logged in: enforce role-based routing
    if (user) {
      let role: string | null = null;
      try {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        role = roleRow?.role ?? null;
      } catch (err) {
        console.error("[middleware] user_roles lookup failed", err);
      }

      const isManagerAllowed =
        pathname.startsWith("/calendar") || pathname.startsWith("/expenses");

      if (isAuthPage) {
        const url = request.nextUrl.clone();
        url.pathname =
          role === "caretaker"
            ? "/agenda"
            : role === "manager"
              ? "/calendar"
              : "/dashboard";
        return NextResponse.redirect(url);
      }

      if (role === "caretaker" && !pathname.startsWith("/agenda")) {
        const url = request.nextUrl.clone();
        url.pathname = "/agenda";
        return NextResponse.redirect(url);
      }

      if (role === "manager" && !isManagerAllowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/calendar";
        return NextResponse.redirect(url);
      }

      if (role === "admin" && pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      if (!role && !isAuthPage) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "no_role");
        return NextResponse.redirect(url);
      }
    }

    return supabaseResponse;
  } catch (err) {
    console.error("[middleware] auth flow failed, passing through", err);
    return supabaseResponse;
  }
}
