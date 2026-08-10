import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const RECOVERY_SETUP_COOKIE = "costivra-recovery-setup";

function markPasswordSetup(response: NextResponse) {
  response.cookies.set(RECOVERY_SETUP_COOKIE, "active", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const destination = new URL("/set-password", request.url);
  const failure = new URL("/login?error=oauth_failed", request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const code = requestUrl.searchParams.get("code");
  const response = NextResponse.redirect(destination);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const result = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("missing_invite_token") };
  if (result.error) return NextResponse.redirect(failure);
  markPasswordSetup(response);
  return response;
}
