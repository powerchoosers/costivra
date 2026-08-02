import { NextResponse } from "next/server";

export function apiError(error: unknown, fallback = "Something went wrong.") {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : null;
  const message = error instanceof Error ? error.message : typeof record?.message === "string" ? record.message : fallback;
  console.error("Portal API error:", message);
  const status = message === "AUTH_REQUIRED" ? 401 : ["NO_ORGANIZATION_MEMBERSHIP", "PORTAL_READ_ONLY"].includes(message) ? 403 : 500;
  const publicMessage = message === "AUTH_REQUIRED"
    ? "Please sign in again."
    : message === "PORTAL_READ_ONLY"
      ? "Your role can view this workspace but cannot change records."
      : message;
  return NextResponse.json({ error: publicMessage }, { status });
}

export function cleanText(value: unknown, maxLength = 255): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function cleanUuid(value: unknown): string {
  const text = cleanText(value, 36);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : "";
}
