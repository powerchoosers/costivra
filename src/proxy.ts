import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validAccessDestination } from "@/lib/auth/access";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isWorkspace = request.nextUrl.pathname.startsWith("/app") || request.nextUrl.pathname.startsWith("/manage");
  const isLogin = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup";

  if (isWorkspace && !data?.claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isLogin && data?.claims && request.nextUrl.searchParams.get("error") !== "no_access") {
    const url = request.nextUrl.clone();
    const requested = validAccessDestination(request.nextUrl.searchParams.get("next"));
    url.pathname = "/access";
    url.search = "";
    if (requested) url.searchParams.set("next", requested);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/manage/:path*", "/login", "/signup"],
};
