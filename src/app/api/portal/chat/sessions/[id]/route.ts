import { NextResponse } from "next/server";
import { apiError } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { getSessionMessages } from "@/lib/client-assistant/repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const { db, organizationId, userId } = await requirePortalContext();

    const messages = await getSessionMessages(db, organizationId, userId, sessionId);
    return NextResponse.json({ sessionId, messages });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const { db, organizationId, userId } = await requirePortalContext();
    const body = await request.json();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.title === "string") {
      updates.title = body.title.trim().slice(0, 100);
    }
    if (typeof body.pinned === "boolean") {
      updates.pinned_at = body.pinned ? new Date().toISOString() : null;
    }
    if (typeof body.archived === "boolean") {
      updates.archived_at = body.archived ? new Date().toISOString() : null;
    }

    const { error } = await db
      .from("chat_sessions")
      .update(updates)
      .eq("id", sessionId)
      .eq("organization_id", organizationId)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ ok: true, sessionId, updates });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const { db, organizationId, userId } = await requirePortalContext();

    // Soft delete (archive)
    const { error } = await db
      .from("chat_sessions")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("organization_id", organizationId)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ ok: true, sessionId, archived: true });
  } catch (error) {
    return apiError(error);
  }
}
