import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { shouldResolveAuthenticatedEntry, validAccessDestination } from "@/lib/auth/access";
import {
  isStaleSessionError,
  isSupabaseAuthCookieName,
} from "@/lib/auth/session-errors";

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

  const { data, error } = await supabase.auth.getClaims();
  if (isStaleSessionError(error)) {
    const staleAuthCookies = request.cookies
      .getAll()
      .filter(({ name }) => isSupabaseAuthCookieName(name));
    staleAuthCookies.forEach(({ name }) => request.cookies.delete(name));
    response = NextResponse.next({ request });
    staleAuthCookies.forEach(({ name }) =>
      response.cookies.set(name, "", { path: "/", maxAge: 0 }),
    );
  }
  const isWorkspace = request.nextUrl.pathname.startsWith("/app") || request.nextUrl.pathname.startsWith("/manage");
  const shouldResolveEntry = shouldResolveAuthenticatedEntry({
    pathname: request.nextUrl.pathname,
    mode: request.nextUrl.searchParams.get("mode"),
    error: request.nextUrl.searchParams.get("error"),
  });

  if (isWorkspace && !data?.claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (shouldResolveEntry && data?.claims) {
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
  matcher: ["/app/:path*", "/manage/:path*", "/login", "/signup", "/set-password"],
};
