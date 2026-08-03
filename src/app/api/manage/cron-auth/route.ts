import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requireInternalOwner } from "@/lib/manage/auth";
import { extractCronTokenWithSource } from "@/lib/cron/auth";
import { getConfiguredEnv } from "@/lib/env/secrets";
import { isConfiguredSecret } from "@/lib/env/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const privateHeaders = { "Cache-Control": "private, no-store" };

function hashPreview(value: string | undefined) {
  if (!value) return null;
  const hash = createHash("sha256").update(value).digest("hex");
  return hash.slice(0, 12);
}

function headerSignal(request: Request) {
  return {
    hasAuthorization: Boolean(request.headers.get("authorization")),
    hasAuth: Boolean(request.headers.get("Authorization")),
    hasCronSecret: Boolean(request.headers.get("x-cron-secret")),
    hasVercelCronSecret: Boolean(request.headers.get("x-vercel-cron-secret")),
    hasVercelCronToken: Boolean(request.headers.get("x-vercel-cron-token")),
    hasCronToken: Boolean(request.headers.get("x-cron-token")),
    hasQuerySecret: Boolean(new URL(request.url).searchParams.get("secret")),
    hasQueryCronSecret: Boolean(new URL(request.url).searchParams.get("cron_secret")),
    hasQueryToken: Boolean(new URL(request.url).searchParams.get("token")),
  };
}

export async function GET(request: Request) {
  try {
    await requireInternalOwner();
    const secret = getConfiguredEnv("CRON_SECRET");
    const extracted = extractCronTokenWithSource(request);
    const configured = isConfiguredSecret(secret);
    return NextResponse.json(
      {
        configured,
        configuredLength: configured ? secret.length : 0,
        configuredFingerprint: configured ? hashPreview(secret) : null,
        extracted: {
          found: Boolean(extracted),
          source: extracted?.source ?? null,
          length: extracted?.token.length ?? 0,
          fingerprint: extracted?.token ? hashPreview(extracted.token) : null,
          matchesConfigured: extracted?.token === secret && configured,
        },
        requestSignals: headerSignal(request),
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    const status = error instanceof Error && ["AUTH_REQUIRED", "INTERNAL_ACCESS_REQUIRED", "OWNER_ACCESS_REQUIRED"].includes(error.message)
      ? (error.message === "AUTH_REQUIRED" ? 401 : 403)
      : 500;
    const message =
      status === 401
        ? "Please sign in again."
        : status === 403
          ? "Only a Costivra owner can run this diagnostic."
          : "Cron auth diagnostics could not be generated.";
    return NextResponse.json(
      { error: message },
      { status, headers: privateHeaders },
    );
  }
}
