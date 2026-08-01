import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isExplicitRecoveryConfirmation } from "@/lib/auth/recovery";

const RECOVERY_SETUP_COOKIE = "costivra-recovery-setup";

function markRecoverySetupRequired(response: NextResponse) {
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
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const destination = new URL("/set-password?mode=recovery", requestUrl.origin);
  const errorDestination = new URL("/set-password?mode=recovery&error=invalid_link", requestUrl.origin);

  if (!tokenHash || !isExplicitRecoveryConfirmation(requestUrl.searchParams)) {
    return NextResponse.redirect(errorDestination);
  }

  const response = NextResponse.redirect(destination);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const startedAt = Date.now();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  console.log(JSON.stringify({
    level: error ? "warning" : "info",
    message: error ? "Password recovery confirmation rejected" : "Password recovery confirmation completed",
    route: "/auth/confirm",
    method: "GET",
    durationMs: Date.now() - startedAt,
  }));

  if (error) return NextResponse.redirect(errorDestination);
  markRecoverySetupRequired(response);
  return response;
}

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const tokenHash = formData.get("token_hash");
  const destination = new URL("/set-password?mode=recovery", requestUrl.origin);
  const errorDestination = new URL("/set-password?mode=recovery&error=invalid_link", requestUrl.origin);

  if (typeof tokenHash !== "string" || !tokenHash) {
    return NextResponse.redirect(errorDestination, 303);
  }

  const response = NextResponse.redirect(destination, 303);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) return NextResponse.redirect(errorDestination, 303);
  markRecoverySetupRequired(response);
  return response;
}
