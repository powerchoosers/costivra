import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatSessionSummary, ClientChatMessage } from "./types";

export type SessionListOptions = {
  db: SupabaseClient;
  organizationId: string;
  userId: string;
  cursor?: string | null;
  limit?: number;
  includeArchived?: boolean;
};

/**
 * Retrieves paginated personal chat sessions for the current authenticated user and organization.
 */
export async function getChatSessions(options: SessionListOptions): Promise<{
  sessions: ChatSessionSummary[];
  nextCursor: string | null;
}> {
  const { db, organizationId, userId, cursor, limit = 20, includeArchived = false } = options;

  let query = db
    .from("chat_sessions")
    .select("id, title, created_at, updated_at, last_message_at, pinned_at, archived_at, metadata")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("pinned_at", { ascending: false, nullsFirst: false })
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(limit + 1);

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  if (cursor) {
    query = query.lt("last_message_at", cursor);
  }

  const { data: rows, error } = await query;
  if (error) throw error;

  const hasMore = (rows?.length ?? 0) > limit;
  const sliced = hasMore ? (rows ?? []).slice(0, limit) : (rows ?? []);

  const sessions: ChatSessionSummary[] = sliced.map((row) => ({
    id: row.id,
    title: row.title ?? "New Conversation",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at ?? row.updated_at,
    pinnedAt: row.pinned_at,
    archivedAt: row.archived_at,
    lastMessagePreview: (row.metadata as Record<string, string>)?.last_message_preview ?? null,
    messageCount: (row.metadata as Record<string, number>)?.message_count ?? 0,
  }));

  const nextCursor = hasMore && sliced.length > 0
    ? sliced[sliced.length - 1].last_message_at ?? sliced[sliced.length - 1].updated_at
    : null;

  return { sessions, nextCursor };
}

/**
 * Creates a new personal chat session.
 */
export async function createChatSession(
  db: SupabaseClient,
  organizationId: string,
  userId: string,
  title = "New Conversation",
): Promise<ChatSessionSummary> {
  const now = new Date().toISOString();
  const { data: row, error } = await db
    .from("chat_sessions")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      title,
      created_at: now,
      updated_at: now,
      last_message_at: now,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at ?? row.updated_at,
    pinnedAt: row.pinned_at,
    archivedAt: row.archived_at,
    lastMessagePreview: null,
    messageCount: 0,
  };
}

/**
 * Retrieves message history for a chat session with tenant validation.
 */
export async function getSessionMessages(
  db: SupabaseClient,
  organizationId: string,
  userId: string,
  sessionId: string,
): Promise<ClientChatMessage[]> {
  // Verify session ownership
  const { data: sess } = await db
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!sess) throw new Error("Chat session not found or access denied.");

  const { data: rows, error } = await db
    .from("chat_messages")
    .select("*, chat_message_documents(document_id)")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (rows ?? []).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    role: row.role as "user" | "assistant",
    content: row.content,
    status: row.status as "pending" | "complete" | "failed" | "cancelled",
    createdAt: row.created_at,
    completedAt: row.completed_at,
    clientRequestId: row.client_request_id,
    citations: (row.citations as unknown as ClientChatMessage["citations"]) ?? [],
    blocks: (row.response_blocks as unknown as ClientChatMessage["blocks"]) ?? [],
    followUps: (row.metadata as Record<string, string[]>)?.follow_ups ?? [],
    missingInformation: (row.metadata as Record<string, string[]>)?.missing_information ?? [],
    attachedDocumentIds: (row.chat_message_documents as unknown as Array<{ document_id: string }>)?.map((d) => d.document_id) ?? [],
  }));
}
