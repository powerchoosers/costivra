import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  MIN_PASSWORD_LENGTH,
  passwordMeetsMinimumLength,
} from "@/lib/auth/password-policy";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const payload: unknown = await request.json();
    const password =
      typeof payload === "object" && payload !== null && "password" in payload
        ? (payload as { password?: unknown }).password
        : null;

    if (typeof password !== "string" || !passwordMeetsMinimumLength(password)) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn("auth.password_update.denied", {
        requestId,
        durationMs: Date.now() - startedAt,
        reason: "missing_authenticated_recovery_session",
      });
      return NextResponse.json(
        {
          error:
            "This secure link is no longer active. Open the newest Costivra password reset email and try again.",
        },
        { status: 401 },
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { internal_owner_invite: false },
    });

    if (updateError) {
      console.error("auth.password_update.failed", {
        requestId,
        durationMs: Date.now() - startedAt,
        reason: updateError.code ?? "supabase_update_failed",
      });
      return NextResponse.json(
        { error: updateError.message || "We could not save your password. Try again." },
        { status: 400 },
      );
    }

    console.info("auth.password_update.completed", {
      requestId,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("auth.password_update.exception", {
      requestId,
      durationMs: Date.now() - startedAt,
      reason: error instanceof Error ? error.name : "unknown_error",
    });
    return NextResponse.json(
      { error: "We could not save your password. Try again." },
      { status: 500 },
    );
  }
}
