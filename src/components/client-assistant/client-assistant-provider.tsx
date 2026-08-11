"use client";

import { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from "react";
import type { AssistantMode, AssistantContextRef, ChatSessionSummary, ClientChatMessage, ClientAssistantAttachment } from "@/lib/client-assistant/types";
import type { ClientAssistantSuggestion } from "@/lib/client-assistant/suggestions";

export type AssistantPhase = "closed" | "opening" | "open" | "transitioning" | "closing";

type AssistantState = {
  mode: AssistantMode;
  phase: AssistantPhase;
  activeSessionId: string | null;
  historyOpen: boolean;
  fullscreenHistoryCollapsed: boolean;
  selectedBlockId: string | null;
  inspectorOpen: boolean;
  sessions: ChatSessionSummary[];
  messages: ClientChatMessage[];
  currentContext: AssistantContextRef | null;
  pendingAttachments: ClientAssistantAttachment[];
  suggestions: ClientAssistantSuggestion[];
  suggestionsLoading: boolean;
  sending: boolean;
  error: string | null;
  viewRevision: number;
};

type AssistantAction =
  | { type: "SET_MODE"; mode: AssistantMode }
  | { type: "SET_PHASE"; phase: AssistantPhase }
  | { type: "TOGGLE_HISTORY" }
  | { type: "TOGGLE_FULLSCREEN_HISTORY" }
  | { type: "SET_FULLSCREEN_HISTORY"; collapsed: boolean }
  | { type: "OPEN_INSPECTOR"; blockId: string }
  | { type: "CLOSE_INSPECTOR" }
  | { type: "SET_SESSIONS"; sessions: ChatSessionSummary[] }
  | { type: "SET_ACTIVE_SESSION"; sessionId: string | null }
  | { type: "SET_MESSAGES"; messages: ClientChatMessage[] }
  | { type: "ADD_MESSAGE"; message: ClientChatMessage }
  | { type: "SET_CONTEXT"; context: AssistantContextRef | null }
  | { type: "UPSERT_ATTACHMENT"; attachment: ClientAssistantAttachment }
  | { type: "UPDATE_ATTACHMENT"; clientUploadId: string; updates: Partial<ClientAssistantAttachment> }
  | { type: "REMOVE_ATTACHMENT"; clientUploadId: string }
  | { type: "CLEAR_ATTACHMENTS" }
  | { type: "SET_SUGGESTIONS"; suggestions: ClientAssistantSuggestion[] }
  | { type: "SET_SUGGESTIONS_LOADING"; loading: boolean }
  | { type: "SET_SENDING"; sending: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "ADVANCE_VIEW" };

const initialState: AssistantState = {
  mode: "closed",
  phase: "closed",
  activeSessionId: null,
  historyOpen: false,
  fullscreenHistoryCollapsed: false,
  selectedBlockId: null,
  inspectorOpen: false,
  sessions: [],
  messages: [],
  currentContext: null,
  pendingAttachments: [],
  suggestions: [],
  suggestionsLoading: false,
  sending: false,
  error: null,
  viewRevision: 0,
};

function assistantReducer(state: AssistantState, action: AssistantAction): AssistantState {
  switch (action.type) {
    case "SET_MODE":
      return {
        ...state,
        mode: action.mode,
        phase: action.mode === "closed" ? "closed" : "open",
      };
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "TOGGLE_HISTORY":
      return { ...state, historyOpen: !state.historyOpen };
    case "TOGGLE_FULLSCREEN_HISTORY": {
      const next = !state.fullscreenHistoryCollapsed;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("costivra.chat.fullscreenHistoryCollapsed", String(next));
        } catch {}
      }
      return { ...state, fullscreenHistoryCollapsed: next };
    }
    case "SET_FULLSCREEN_HISTORY":
      return { ...state, fullscreenHistoryCollapsed: action.collapsed };
    case "OPEN_INSPECTOR":
      return { ...state, selectedBlockId: action.blockId, inspectorOpen: true };
    case "CLOSE_INSPECTOR":
      return { ...state, selectedBlockId: null, inspectorOpen: false };
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
    case "SET_SUGGESTIONS":
      return { ...state, suggestions: action.suggestions };
    case "SET_SUGGESTIONS_LOADING":
      return { ...state, suggestionsLoading: action.loading };
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
  toggleFullscreenHistory: () => void;
  openInspector: (blockId: string) => void;
  closeInspector: () => void;
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

  // Initialize stored collapsed state for fullscreen history rail
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("costivra.chat.fullscreenHistoryCollapsed");
        if (stored !== null) {
          dispatch({ type: "SET_FULLSCREEN_HISTORY", collapsed: stored === "true" });
        } else if (window.innerWidth < 1180) {
          dispatch({ type: "SET_FULLSCREEN_HISTORY", collapsed: true });
        }
      } catch {}
    }
  }, []);

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

  const fetchSuggestions = useCallback(async () => {
    dispatch({ type: "SET_SUGGESTIONS_LOADING", loading: true });
    try {
      const res = await fetch("/api/portal/chat/suggestions", { cache: "no-store" });
      if (!res.ok) throw new Error("Suggestions unavailable");
      const data = await res.json() as { suggestions?: ClientAssistantSuggestion[] };
      dispatch({ type: "SET_SUGGESTIONS", suggestions: Array.isArray(data.suggestions) ? data.suggestions : [] });
    } catch {
      // The welcome view has a graceful generic fallback, so a prompt failure
      // never blocks a person from asking a question directly.
      dispatch({ type: "SET_SUGGESTIONS", suggestions: [] });
    } finally {
      dispatch({ type: "SET_SUGGESTIONS_LOADING", loading: false });
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

  const createSession = useCallback(() => {
    dispatch({ type: "ADVANCE_VIEW" });
    dispatch({ type: "SET_ACTIVE_SESSION", sessionId: null });
    dispatch({ type: "SET_MESSAGES", messages: [] });
    dispatch({ type: "CLEAR_ATTACHMENTS" });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    let sessId = state.activeSessionId;
    if (!sessId) {
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
    dispatch({ type: "SET_PHASE", phase: "opening" });
    dispatch({ type: "SET_MODE", mode: "drawer" });
    fetchSessions();
    fetchSuggestions();
    setTimeout(() => dispatch({ type: "SET_PHASE", phase: "open" }), 20);
  }, [fetchSessions, fetchSuggestions]);

  const openFullscreen = useCallback(() => {
    dispatch({ type: "SET_PHASE", phase: "opening" });
    dispatch({ type: "SET_MODE", mode: "fullscreen" });
    fetchSessions();
    fetchSuggestions();
    setTimeout(() => dispatch({ type: "SET_PHASE", phase: "open" }), 20);
  }, [fetchSessions, fetchSuggestions]);

  const closeAssistant = useCallback(() => {
    dispatch({ type: "SET_PHASE", phase: "closing" });
    setTimeout(() => {
      dispatch({ type: "SET_MODE", mode: "closed" });
      dispatch({ type: "SET_PHASE", phase: "closed" });
    }, 240);
  }, []);

  const toggleHistory = useCallback(() => {
    dispatch({ type: "TOGGLE_HISTORY" });
  }, []);

  const toggleFullscreenHistory = useCallback(() => {
    dispatch({ type: "TOGGLE_FULLSCREEN_HISTORY" });
  }, []);

  const openInspector = useCallback((blockId: string) => {
    dispatch({ type: "OPEN_INSPECTOR", blockId });
  }, []);

  const closeInspector = useCallback(() => {
    dispatch({ type: "CLOSE_INSPECTOR" });
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
        toggleFullscreenHistory,
        openInspector,
        closeInspector,
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
