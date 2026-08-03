import { NextResponse } from "next/server";

export class PortalInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalInputError";
  }
}

export function apiError(error: unknown, fallback = "Something went wrong.") {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : null;
  const message = error instanceof Error ? error.message : typeof record?.message === "string" ? record.message : fallback;
  console.error("Portal API error:", message);
  if (error instanceof PortalInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (message === "AUTH_REQUIRED") {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (message === "NO_ORGANIZATION_MEMBERSHIP") {
    return NextResponse.json(
      { error: "This account does not have an active Costivra workspace." },
      { status: 403 },
    );
  }
  if (message === "PORTAL_READ_ONLY") {
    return NextResponse.json(
      { error: "Your role can view this workspace but cannot change records." },
      { status: 403 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function cleanText(value: unknown, maxLength = 255): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function cleanUuid(value: unknown): string {
  const text = cleanText(value, 36);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : "";
}
