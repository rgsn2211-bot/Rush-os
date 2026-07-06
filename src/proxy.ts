import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { homeForRole, roleRedirectPath } from "@/lib/roles";
import type { UserRole } from "@/types/inventory";

async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role ?? null;
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Self-registration is disabled — Rush OS runs with a fixed set of accounts.
  // Send any stale /signup links to the login page instead of 404.
  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    !user &&
    (pathname.startsWith("/owner") ||
      pathname.startsWith("/worker") ||
      pathname.startsWith("/pos-manager"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const role = (await getUserRole(supabase, user.id)) as UserRole | null;
    const home = homeForRole(role);

    if (pathname === "/login") {
      return NextResponse.redirect(new URL(home, request.url));
    }

    if (pathname === "/") {
      return NextResponse.redirect(new URL(home, request.url));
    }

    // Wall each role-gated section off from the other roles.
    const away = roleRedirectPath(role, pathname);
    if (away) {
      return NextResponse.redirect(new URL(away, request.url));
    }
  }

  if (!user && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api).*)",
  ],
};
