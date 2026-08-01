import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { validatePasswordUpdate } from "@/lib/auth/password-policy";

type PasswordPayload = {
  password: string;
  confirmation: string;
};

const RECOVERY_SETUP_COOKIE = "costivra-recovery-setup";

function clearRecoverySetupRequirement(response: NextResponse) {
  response.cookies.set(RECOVERY_SETUP_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function redirectToForm(request: NextRequest, error: string) {
  const url = new URL("/set-password", request.url);
  url.searchParams.set("mode", "recovery");
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

function failure(
  request: NextRequest,
  acceptsJson: boolean,
  status: number,
  code: string,
  message: string,
) {
  return acceptsJson
    ? NextResponse.json({ error: message, code }, { status })
    : redirectToForm(request, code);
}

async function readPasswordPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const acceptsJson = contentType.includes("application/json");

  if (acceptsJson) {
    const body = (await request.json()) as Record<string, unknown>;
    return {
      acceptsJson,
      password: typeof body.password === "string" ? body.password : "",
      confirmation:
        typeof body.confirmation === "string" ? body.confirmation : "",
    } satisfies PasswordPayload & { acceptsJson: boolean };
  }

  const formData = await request.formData();
  return {
    acceptsJson,
    password: String(formData.get("password") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  } satisfies PasswordPayload & { acceptsJson: boolean };
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-vercel-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  let acceptsJson = request.headers
    .get("content-type")
    ?.includes("application/json") ?? false;

  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).origin !== request.nextUrl.origin) {
      return failure(
        request,
        acceptsJson,
        403,
        "invalid_origin",
        "This password request did not come from Costivra.",
      );
    }

    const payload = await readPasswordPayload(request);
    acceptsJson = payload.acceptsJson;
    const validation = validatePasswordUpdate(
      payload.password,
      payload.confirmation,
    );
    if (!validation.ok) {
      return failure(
        request,
        acceptsJson,
        400,
        validation.code,
        validation.message,
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
        reason: userError?.code ?? "missing_authenticated_recovery_session",
      });
      return failure(
        request,
        acceptsJson,
        401,
        "invalid_session",
        "Your recovery session has expired. Request a new reset link and try again.",
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: payload.password,
      data: { internal_owner_invite: false },
    });

    if (updateError) {
      console.error("auth.password_update.failed", {
        requestId,
        durationMs: Date.now() - startedAt,
        reason: updateError.code ?? "supabase_update_failed",
      });
      return failure(
        request,
        acceptsJson,
        400,
        "save_failed",
        updateError.message || "We could not save your password. Try again.",
      );
    }

    console.info("auth.password_update.completed", {
      requestId,
      durationMs: Date.now() - startedAt,
    });

    if (acceptsJson) {
      const response = NextResponse.json({ success: true });
      clearRecoverySetupRequirement(response);
      return response;
    }
    const response = NextResponse.redirect(
      new URL("/access?password=changed", request.url),
      303,
    );
    clearRecoverySetupRequirement(response);
    return response;
  } catch (error) {
    console.error("auth.password_update.exception", {
      requestId,
      durationMs: Date.now() - startedAt,
      reason: error instanceof Error ? error.name : "unknown_error",
    });
    return failure(
      request,
      acceptsJson,
      500,
      "save_failed",
      "We could not save your password. Try again.",
    );
  }
}
