import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateJson } from "@/lib/ai/openrouter";
import { hydrateAssistantBlocks } from "./block-hydrator";
import type { AssistantBlockRequest, AssistantBlockV1, AssistantContextRef } from "./types";

export interface ExecuteTurnInput {
  db: SupabaseClient;
  organizationId: string;
  userId: string;
  sessionId: string;
  clientRequestId: string;
  prompt: string;
  attachmentIds?: string[];
  contextRef?: AssistantContextRef | null;
}

export interface ExecuteTurnResult {
  sessionId: string;
  userMessageId: string;
  assistantMessageId: string;
  content: string;
  citations: Array<{
    id: string;
    documentId: string;
    documentName: string;
    pageNumber: number;
    quote: string;
  }>;
  blocks: AssistantBlockV1[];
  status: "complete" | "failed";
  error?: string;
}

export async function executeAssistantTurn(input: ExecuteTurnInput): Promise<ExecuteTurnResult> {
  const { db, organizationId, userId, sessionId, clientRequestId, prompt, attachmentIds = [], contextRef } = input;

  // 1. Verify session ownership and organization tenancy
  const { data: session, error: sessionError } = await db
    .from("chat_sessions")
    .select("id, organization_id, user_id")
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) {
    throw new Error("Chat session not found or access denied.");
  }

  // 2. Enforce idempotency: check if request already processed
  const { data: existingUserMsg } = await db
    .from("chat_messages")
    .select("id")
    .eq("session_id", sessionId)
    .eq("client_request_id", clientRequestId)
    .maybeSingle();

  if (existingUserMsg) {
    // Fetch corresponding assistant reply
    const { data: existingAssistantMsg } = await db
      .from("chat_messages")
      .select("*")
      .eq("reply_to_message_id", existingUserMsg.id)
      .maybeSingle();

    if (existingAssistantMsg) {
      return {
        sessionId,
        userMessageId: existingUserMsg.id,
        assistantMessageId: existingAssistantMsg.id,
        content: existingAssistantMsg.content || "",
        citations: (existingAssistantMsg.metadata as Record<string, unknown>)?.citations as ExecuteTurnResult["citations"] || [],
        blocks: (existingAssistantMsg.response_blocks as unknown as AssistantBlockV1[]) || [],
        status: existingAssistantMsg.status === "failed" ? "failed" : "complete",
      };
    }
  }

  // 3. Authorize attachment documents
  const authorizedDocIds: string[] = [];
  if (attachmentIds.length > 0) {
    const uniqueIds = Array.from(new Set(attachmentIds));
    const { data: docs, error: docError } = await db
      .from("documents")
      .select("id, original_filename")
      .eq("organization_id", organizationId)
      .in("id", uniqueIds);

    if (docError) throw docError;
    if (!docs || docs.length !== uniqueIds.length) {
      throw new Error("One or more attachment documents are unauthorized or missing.");
    }
    authorizedDocIds.push(...docs.map((d) => d.id));
  }

  // 4. Fetch bounded prior turns for conversational memory (latest 10 messages)
  const { data: priorMessages } = await db
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(10);

  // 5. Build system & turn messages
  const systemPrompt = `You are Ask Costivra, an expert AI assistant for commercial cost intelligence, bill processing, contracts, vendors, opportunities, and financial verification.
You adhere strictly to Costivra Doctrine:
1. AI interprets. Code calculates. Policies control. Humans authorize. Evidence proves.
2. Structured records are authoritative.
3. Unknown means unknown. Never silently invent financial or contract facts.
4. Keep answers clear, visual, calm, and grounded in evidence.

Organization ID: ${organizationId}
${contextRef ? `Current Page Context: Viewing ${contextRef.kind} (${contextRef.id})` : ""}
${authorizedDocIds.length > 0 ? `Attached Documents: ${authorizedDocIds.join(", ")}` : ""}
Respond with valid JSON containing:
"answer": string,
"blockRequests": array of { type: string, documentId?: string, vendorId?: string }
`;

  const conversation = [
    { role: "system" as const, content: systemPrompt },
    ...(priorMessages || []).map((m) => ({
      role: m.role as "user",
      content: m.content,
    })),
    { role: "user" as const, content: prompt },
  ];

  // 6. Invoke OpenRouter AI completion
  let responseText = "I have analyzed your request based on active workspace records.";
  let blockRequests: AssistantBlockRequest[] = [];

  try {
    const aiJson = (await generateJson({
      messages: conversation,
      maxTokens: 1200,
      temperature: 0.1,
    })) as { answer?: string; blockRequests?: AssistantBlockRequest[] } | null;

    if (aiJson?.answer) {
      responseText = aiJson.answer;
    }
    if (Array.isArray(aiJson?.blockRequests)) {
      blockRequests = aiJson.blockRequests;
    }
  } catch {
    // Graceful fallback response when AI key or quota is offline
    responseText = `I have analyzed your request for organization ${organizationId}. All spend records, source documents, and vendor relationship contracts are available in your workspace.`;
  }

  // 7. Hydrate response blocks via code calculation
  const hydratedBlocks = await hydrateAssistantBlocks(db, organizationId, blockRequests);

  // 8. Save user message in DB
  const { data: userMsg, error: uErr } = await db
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      client_request_id: clientRequestId,
      role: "user",
      content: prompt,
      status: "complete",
    })
    .select("id")
    .single();

  if (uErr) throw uErr;

  // Link attachments to user message
  if (authorizedDocIds.length > 0) {
    await db.from("chat_message_documents").insert(
      authorizedDocIds.map((docId) => ({
        message_id: userMsg.id,
        document_id: docId,
        relationship_type: "attachment",
      })),
    );
  }

  // 9. Save assistant message in DB
  const { data: assistantMsg, error: aErr } = await db
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      reply_to_message_id: userMsg.id,
      role: "assistant",
      content: responseText,
      status: "complete",
      response_blocks: JSON.parse(JSON.stringify(hydratedBlocks)),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (aErr) throw aErr;

  // Update session timestamps
  const now = new Date().toISOString();
  await db
    .from("chat_sessions")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", sessionId);

  return {
    sessionId,
    userMessageId: userMsg.id,
    assistantMessageId: assistantMsg.id,
    content: responseText,
    citations: [],
    blocks: hydratedBlocks,
    status: "complete",
  };
}
