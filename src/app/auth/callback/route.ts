import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { validAccessDestination } from "@/lib/auth/access";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requested = validAccessDestination(request.nextUrl.searchParams.get("next"));
  const errorDestination = new URL("/login?error=oauth_failed", request.url);
  if (!code) return NextResponse.redirect(errorDestination);

  const accessDestination = new URL("/access", request.url);
  if (requested) accessDestination.searchParams.set("next", requested);
  const response = NextResponse.redirect(accessDestination);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(errorDestination);
  return response;
}
