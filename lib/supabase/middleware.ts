import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing, skip middleware entirely
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnon,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAdminAuthPage    = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password");
  const isOperadorAuthPage = pathname === "/operador/login" || pathname.startsWith("/operador/login");
  const isAuthPage         = isAdminAuthPage || isOperadorAuthPage;
  const isDashboardPage    = pathname.startsWith("/dashboard");
  // Protect /escanear/* but not /operador/login
  const isOperadorPage     = pathname.startsWith("/escanear");

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!user) {
    if (isDashboardPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (isOperadorPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/operador/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // ── Authenticated: route by role ───────────────────────────────────────────
  if (user) {
    const metaRole = (user.user_metadata?.role as string | undefined) ??
                     (user.app_metadata?.role as string | undefined);

    let role = metaRole;
    if (!role) {
      try {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = data?.role ?? "admin";
      } catch {
        role = "admin";
      }
    }

    const isOperator = role === "operator";

    // Redirect away from any auth page
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = isOperator ? "/escanear" : "/dashboard";
      return NextResponse.redirect(url);
    }

    // Operators cannot access the admin dashboard
    if (isOperator && isDashboardPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/escanear";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
