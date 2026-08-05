"use client";

import { createContext, useContext, useReducer, ReactNode, useCallback } from "react";
import type { AssistantMode, AssistantContextRef, ChatSessionSummary, ClientChatMessage, ClientAssistantAttachment } from "@/lib/client-assistant/types";

type AssistantState = {
  mode: AssistantMode;
  activeSessionId: string | null;
  historyOpen: boolean;
  sessions: ChatSessionSummary[];
  messages: ClientChatMessage[];
  currentContext: AssistantContextRef | null;
  pendingAttachments: ClientAssistantAttachment[];
  sending: boolean;
  error: string | null;
  viewRevision: number;
};

type AssistantAction =
  | { type: "SET_MODE"; mode: AssistantMode }
  | { type: "TOGGLE_HISTORY" }
  | { type: "SET_SESSIONS"; sessions: ChatSessionSummary[] }
  | { type: "SET_ACTIVE_SESSION"; sessionId: string | null }
  | { type: "SET_MESSAGES"; messages: ClientChatMessage[] }
  | { type: "ADD_MESSAGE"; message: ClientChatMessage }
  | { type: "SET_CONTEXT"; context: AssistantContextRef | null }
  | { type: "UPSERT_ATTACHMENT"; attachment: ClientAssistantAttachment }
  | { type: "UPDATE_ATTACHMENT"; clientUploadId: string; updates: Partial<ClientAssistantAttachment> }
  | { type: "REMOVE_ATTACHMENT"; clientUploadId: string }
  | { type: "CLEAR_ATTACHMENTS" }
  | { type: "SET_SENDING"; sending: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "ADVANCE_VIEW" };

const initialState: AssistantState = {
  mode: "closed",
  activeSessionId: null,
  historyOpen: false,
  sessions: [],
  messages: [],
  currentContext: null,
  pendingAttachments: [],
  sending: false,
  error: null,
  viewRevision: 0,
};

function assistantReducer(state: AssistantState, action: AssistantAction): AssistantState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "TOGGLE_HISTORY":
      return { ...state, historyOpen: !state.historyOpen };
    case "SET_SESSIONS":
      return { ...state, sessions: action.sessions };
    case "SET_ACTIVE_SESSION":
      return { ...state, activeSessionId: action.sessionId, historyOpen: false, error: null };
    case "SET_MESSAGES":
      return { ...state, messages: action.messages };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };
    case "SET_CONTEXT":
      return { ...state, currentContext: action.context };
    case "UPSERT_ATTACHMENT": {
      const idx = state.pendingAttachments.findIndex((a) => a.clientUploadId === action.attachment.clientUploadId);
      if (idx >= 0) {
        const next = [...state.pendingAttachments];
        next[idx] = { ...next[idx], ...action.attachment };
        return { ...state, pendingAttachments: next };
      }
      return { ...state, pendingAttachments: [...state.pendingAttachments, action.attachment] };
    }
    case "UPDATE_ATTACHMENT": {
      return {
        ...state,
        pendingAttachments: state.pendingAttachments.map((a) =>
          a.clientUploadId === action.clientUploadId ? { ...a, ...action.updates } : a
        ),
      };
    }
    case "REMOVE_ATTACHMENT":
      return { ...state, pendingAttachments: state.pendingAttachments.filter((a) => a.clientUploadId !== action.clientUploadId) };
    case "CLEAR_ATTACHMENTS":
      return { ...state, pendingAttachments: [] };
    case "SET_SENDING":
      return { ...state, sending: action.sending };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "ADVANCE_VIEW":
      return { ...state, viewRevision: state.viewRevision + 1 };
    default:
      return state;
  }
}

type ContextValue = {
  state: AssistantState;
  openDrawer: () => void;
  openFullscreen: () => void;
  closeAssistant: () => void;
  toggleHistory: () => void;
  selectSession: (id: string | null) => Promise<void>;
  createSession: () => void;
  sendMessage: (text: string) => Promise<void>;
  uploadAttachment: (file: File) => Promise<void>;
  removeAttachment: (clientUploadId: string) => void;
  setContext: (context: AssistantContextRef | null) => void;
};

const ClientAssistantContext = createContext<ContextValue | null>(null);

export function ClientAssistantProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(assistantReducer, initialState);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/chat/sessions");
      if (res.ok) {
        const data = await res.json();
        dispatch({ type: "SET_SESSIONS", sessions: data.sessions });
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to load chat history." });
    }
  }, []);

  const selectSession = useCallback(async (sessionId: string | null) => {
    dispatch({ type: "ADVANCE_VIEW" });
    dispatch({ type: "SET_ACTIVE_SESSION", sessionId });
    if (!sessionId) {
      dispatch({ type: "SET_MESSAGES", messages: [] });
      return;
    }
    try {
      const res = await fetch(`/api/portal/chat/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        dispatch({ type: "SET_MESSAGES", messages: data.messages });
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to load session messages." });
    }
  }, []);

  // Plus button creates a local blank state without immediately writing a DB row
  const createSession = useCallback(() => {
    dispatch({ type: "ADVANCE_VIEW" });
    dispatch({ type: "SET_ACTIVE_SESSION", sessionId: null });
    dispatch({ type: "SET_MESSAGES", messages: [] });
    dispatch({ type: "CLEAR_ATTACHMENTS" });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    let sessId = state.activeSessionId;
    if (!sessId) {
      // Lazy-create session on first turn
      const res = await fetch("/api/portal/chat/sessions", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        sessId = data.session.id;
        dispatch({ type: "SET_ACTIVE_SESSION", sessionId: sessId });
        await fetchSessions();
      }
    }
    if (!sessId) return;

    dispatch({ type: "SET_SENDING", sending: true });
    dispatch({ type: "SET_ERROR", error: null });

    const docIds = state.pendingAttachments.map((a) => a.documentId).filter((id): id is string => Boolean(id));

    // Client User Message Optimistic
    const optUserMsg: ClientChatMessage = {
      id: crypto.randomUUID(),
      sessionId: sessId,
      role: "user",
      content: text,
      status: "complete",
      createdAt: new Date().toISOString(),
      attachedDocumentIds: docIds,
    };
    dispatch({ type: "ADD_MESSAGE", message: optUserMsg });
    dispatch({ type: "CLEAR_ATTACHMENTS" });

    try {
      const res = await fetch(`/api/portal/chat/sessions/${sessId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          clientRequestId: crypto.randomUUID(),
          contextRef: state.currentContext,
          attachmentDocumentIds: docIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        dispatch({ type: "ADD_MESSAGE", message: data.assistantMessage });
        await fetchSessions();
      } else {
        const errData = await res.json().catch(() => null);
        dispatch({ type: "SET_ERROR", error: errData?.error || "Failed to send message." });
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Connection error while generating response." });
    } finally {
      dispatch({ type: "SET_SENDING", sending: false });
    }
  }, [state.activeSessionId, state.pendingAttachments, state.currentContext, fetchSessions]);

  const uploadAttachment = useCallback(async (file: File) => {
    const clientUploadId = crypto.randomUUID();
    dispatch({
      type: "UPSERT_ATTACHMENT",
      attachment: {
        clientUploadId,
        file,
        filename: file.name,
        byteSize: file.size,
        mimeType: file.type,
        status: "uploading",
      },
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientUploadId", clientUploadId);

    try {
      const res = await fetch("/api/portal/chat/attachments", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        dispatch({
          type: "UPDATE_ATTACHMENT",
          clientUploadId,
          updates: {
            documentId: data.documentId,
            status: data.outcome === "processed" || data.outcome === "duplicate" ? "processed" : "rejected",
            invoiceId: data.invoiceId,
            reviewStatus: data.reviewStatus,
          },
        });
      } else {
        dispatch({
          type: "UPDATE_ATTACHMENT",
          clientUploadId,
          updates: { status: "failed" },
        });
      }
    } catch {
      dispatch({
        type: "UPDATE_ATTACHMENT",
        clientUploadId,
        updates: { status: "failed" },
      });
    }
  }, []);

  const removeAttachment = useCallback((clientUploadId: string) => {
    dispatch({ type: "REMOVE_ATTACHMENT", clientUploadId });
  }, []);

  const openDrawer = useCallback(() => {
    dispatch({ type: "SET_MODE", mode: "drawer" });
    fetchSessions();
  }, [fetchSessions]);

  const openFullscreen = useCallback(() => {
    dispatch({ type: "SET_MODE", mode: "fullscreen" });
    fetchSessions();
  }, [fetchSessions]);

  const closeAssistant = useCallback(() => {
    dispatch({ type: "SET_MODE", mode: "closed" });
  }, []);

  const toggleHistory = useCallback(() => {
    dispatch({ type: "TOGGLE_HISTORY" });
  }, []);

  const setContext = useCallback((context: AssistantContextRef | null) => {
    dispatch({ type: "SET_CONTEXT", context });
  }, []);

  return (
    <ClientAssistantContext.Provider
      value={{
        state,
        openDrawer,
        openFullscreen,
        closeAssistant,
        toggleHistory,
        selectSession,
        createSession,
        sendMessage,
        uploadAttachment,
        removeAttachment,
        setContext,
      }}
    >
      {children}
    </ClientAssistantContext.Provider>
  );
}

export function useClientAssistant() {
  const ctx = useContext(ClientAssistantContext);
  if (!ctx) throw new Error("useClientAssistant must be used within ClientAssistantProvider");
  return ctx;
}
