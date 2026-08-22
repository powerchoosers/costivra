import { NextResponse } from "next/server";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { executeAssistantTurn } from "@/lib/client-assistant/service";
import type { AssistantContextRef } from "@/lib/client-assistant/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const { db, organizationId, userId } = await requirePortalContext();
    const body = (await request.json()) as Record<string, unknown>;

    const text = cleanText(body.text, 8000);
    const clientRequestId = cleanText(body.clientRequestId, 100) || crypto.randomUUID();
    const contextRef = (body.contextRef && typeof body.contextRef === "object")
      ? (body.contextRef as AssistantContextRef)
      : null;
    const attachmentDocumentIds = Array.isArray(body.attachmentDocumentIds)
      ? body.attachmentDocumentIds.filter((id: unknown): id is string => typeof id === "string")
      : [];

    if (!text && attachmentDocumentIds.length === 0) {
      return NextResponse.json(
        { error: "Message text or document attachments are required." },
        { status: 400 },
      );
    }

    // Delegate assistant turn to single server-side service
    const result = await executeAssistantTurn({
      db,
      organizationId,
      userId,
      sessionId,
      clientRequestId,
      prompt: text || "Please review attached document(s) and workspace evidence.",
      attachmentIds: attachmentDocumentIds,
      contextRef,
    });

    const completedAt = new Date().toISOString();

    return NextResponse.json({
      userMessageId: result.userMessageId,
      assistantMessage: {
        id: result.assistantMessageId,
        sessionId,
        role: "assistant",
        content: result.content,
        status: result.status,
        createdAt: completedAt,
        completedAt,
        citations: result.citations,
        blocks: result.blocks,
        followUps: result.followUps,
        missingInformation: result.missingInformation,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
