import { NextResponse } from "next/server";
import { apiError } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { getChatSessions, createChatSession } from "@/lib/client-assistant/repository";

export async function GET(request: Request) {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const includeArchived = url.searchParams.get("includeArchived") === "true";

    const result = await getChatSessions({
      db,
      organizationId,
      userId,
      cursor,
      limit,
      includeArchived,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 100) : "New Conversation";

    const session = await createChatSession(db, organizationId, userId, title);

    // Audit event
    await db.from("audit_events").insert({
      organization_id: organizationId,
      actor_id: userId,
      event_type: "chat.session_created",
      target_id: session.id,
      target_type: "chat_sessions",
      metadata: { title: session.title },
    });

    return NextResponse.json({ session });
  } catch (error) {
    return apiError(error);
  }
}
