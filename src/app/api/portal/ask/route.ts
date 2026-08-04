import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { createChatSession } from "@/lib/client-assistant/repository";

export async function POST(request: Request) {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const body = (await request.json()) as Record<string, unknown>;
    const question = cleanText(body.question, 2_000);
    if (!question) return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
    let sessionId = cleanUuid(body.sessionId);

    if (sessionId) {
      const { data: session } = await db
        .from("chat_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!session) sessionId = "";
    }

    if (!sessionId) {
      const session = await createChatSession(db, organizationId, userId, question.slice(0, 72));
      sessionId = session.id;
    }

    // Call new session messages endpoint internally
    const messageUrl = new URL(`/api/portal/chat/sessions/${sessionId}/messages`, request.url);
    const msgRes = await fetch(messageUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        text: question,
        clientRequestId: crypto.randomUUID(),
      }),
    });

    if (!msgRes.ok) {
      const err = await msgRes.json().catch(() => ({ error: "Message processing failed." }));
      return NextResponse.json(err, { status: msgRes.status });
    }

    const payload = await msgRes.json();
    return NextResponse.json({
      sessionId,
      answer: payload.assistantMessage.content,
      citations: payload.assistantMessage.citations ?? [],
      blocks: payload.assistantMessage.blocks ?? [],
      followUps: payload.assistantMessage.followUps ?? [],
    });
  } catch (error) {
    return apiError(error, "Costivra could not answer that question.");
  }
}
