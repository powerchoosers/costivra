import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ManageAssistantHistorySource = {
  id: string;
  label: string;
  detail: string;
  href: string;
  kind: "account" | "contact" | "mail" | "task" | "activity";
};

export type ManageAssistantSessionSummary = {
  id: string;
  title: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ManageAssistantHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: ManageAssistantHistorySource[];
  createdAt: string;
};

type SessionRow = {
  id: string;
  title: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  role: string;
  content: string;
  sources: unknown;
  created_at: string;
};

function sessionSummary(row: SessionRow): ManageAssistantSessionSummary {
  return {
    id: row.id,
    title: row.title,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validSource(value: unknown): value is ManageAssistantHistorySource {
  if (!value || typeof value !== "object") return false;
  const source = value as Record<string, unknown>;
  return (
    typeof source.id === "string" &&
    typeof source.label === "string" &&
    typeof source.detail === "string" &&
    typeof source.href === "string" &&
    (source.kind === "account" || source.kind === "contact" || source.kind === "mail" || source.kind === "task" || source.kind === "activity")
  );
}

function historyMessage(row: MessageRow): ManageAssistantHistoryMessage | null {
  if (row.role !== "user" && row.role !== "assistant") return null;
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    sources: Array.isArray(row.sources) ? row.sources.filter(validSource).slice(0, 8) : [],
    createdAt: row.created_at,
  };
}

export function fallbackManageConversationTitle(prompt: string) {
  const words = prompt.trim().replace(/\s+/g, " ").split(" ").filter(Boolean).slice(0, 6);
  if (!words.length) return "Costivra review";
  const title = words.join(" ");
  return title.length > 80 ? `${title.slice(0, 77).trimEnd()}…` : title;
}

export function cleanManageConversationTitle(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const title = value.replace(/\s+/g, " ").trim().replace(/[.?!:;]+$/g, "");
  if (title.length < 3 || title.length > 100) return fallback;
  return title;
}

export async function getManageAssistantSessions(
  db: SupabaseClient,
  actorId: string,
  limit = 20,
) {
  const { data, error } = await db
    .from("internal_assistant_sessions")
    .select("id,title,last_message_preview,last_message_at,created_at,updated_at")
    .eq("actor_id", actorId)
    .is("archived_at", null)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) throw error;
  return ((data ?? []) as SessionRow[]).map(sessionSummary);
}

export async function getManageAssistantSession(
  db: SupabaseClient,
  actorId: string,
  sessionId: string,
) {
  const { data, error } = await db
    .from("internal_assistant_sessions")
    .select("id,title,last_message_preview,last_message_at,created_at,updated_at")
    .eq("id", sessionId)
    .eq("actor_id", actorId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? sessionSummary(data as SessionRow) : null;
}

export async function createManageAssistantSession(
  db: SupabaseClient,
  actorId: string,
  section: string,
  detailId: string | null,
) {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("internal_assistant_sessions")
    .insert({
      actor_id: actorId,
      title: "New conversation",
      section,
      detail_id: detailId,
      created_at: now,
      updated_at: now,
    })
    .select("id,title,last_message_preview,last_message_at,created_at,updated_at")
    .single();
  if (error) throw error;
  return sessionSummary(data as SessionRow);
}

export async function getManageAssistantMessages(
  db: SupabaseClient,
  actorId: string,
  sessionId: string,
) {
  const { data, error } = await db
    .from("internal_assistant_messages")
    .select("id,role,content,sources,created_at")
    .eq("session_id", sessionId)
    .eq("actor_id", actorId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as MessageRow[])
    .map(historyMessage)
    .filter((message): message is ManageAssistantHistoryMessage => Boolean(message));
}

export async function appendManageAssistantMessage(
  db: SupabaseClient,
  input: {
    sessionId: string;
    actorId: string;
    role: "user" | "assistant";
    content: string;
    sources?: ManageAssistantHistorySource[];
  },
) {
  const { error } = await db.from("internal_assistant_messages").insert({
    session_id: input.sessionId,
    actor_id: input.actorId,
    role: input.role,
    content: input.content,
    sources: input.sources ?? [],
  });
  if (error) throw error;
}

export async function touchManageAssistantSession(
  db: SupabaseClient,
  input: {
    sessionId: string;
    actorId: string;
    title?: string;
    lastMessagePreview: string;
  },
) {
  const now = new Date().toISOString();
  const patch: Record<string, string> = {
    updated_at: now,
    last_message_at: now,
    last_message_preview: input.lastMessagePreview.slice(0, 280),
  };
  if (input.title) patch.title = input.title;
  const { data, error } = await db
    .from("internal_assistant_sessions")
    .update(patch)
    .eq("id", input.sessionId)
    .eq("actor_id", input.actorId)
    .select("id,title,last_message_preview,last_message_at,created_at,updated_at")
    .single();
  if (error) throw error;
  return sessionSummary(data as SessionRow);
}
