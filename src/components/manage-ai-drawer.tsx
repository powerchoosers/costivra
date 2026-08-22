"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Mail,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  MessageSquare,
  UserRound,
  X,
} from "@/lib/icons";
import {
  AssistantComposerShell,
  AssistantIconButton,
  AssistantWorkspaceHeader,
} from "@/components/assistant-workspace";
import { CostivraAssistantIcon } from "@/components/assistant-icon";
import { resizeAssistantComposer } from "@/lib/ui/assistant-composer";
import type {
  ManageAssistantSource,
  ManageAssistantSuggestion,
} from "@/lib/manage/assistant";
import "@/components/client-assistant/client-assistant.css";

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ManageAssistantSource[];
};

type SuggestionResponse = {
  contextLabel?: string;
  suggestions?: ManageAssistantSuggestion[];
  updatedAt?: string;
  error?: string;
};

type ManageAssistantSession = {
  id: string;
  title: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const icons = {
  account: Building2,
  contact: UserRound,
  mail: Mail,
  task: CalendarClock,
  activity: Activity,
};

function messageId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function ManageAiDrawer({
  open,
  onClose,
  section,
  detailId,
  initialQuestion,
  initialSessionId,
}: {
  open: boolean;
  onClose: () => void;
  section: string;
  detailId?: string | null;
  initialQuestion?: string | null;
  initialSessionId?: string | null;
}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [suggestions, setSuggestions] = useState<ManageAssistantSuggestion[]>([]);
  const [sessions, setSessions] = useState<ManageAssistantSession[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [contextLabel, setContextLabel] = useState("Client operations");
  const [input, setInput] = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationRevision, setConversationRevision] = useState(0);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"drawer" | "fullscreen">("drawer");
  const [liveSuggestionsCollapsed, setLiveSuggestionsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const isFullscreen = mode === "fullscreen";

  async function loadSuggestions() {
    setLoadingSuggestions(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/manage/assistant?section=${encodeURIComponent(section)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as SuggestionResponse | null;
      if (!response.ok) throw new Error(payload?.error || "Suggestions are unavailable.");
      setSuggestions(payload?.suggestions ?? []);
      setContextLabel(payload?.contextLabel || "Client operations");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Suggestions are unavailable.");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function loadSessions() {
    try {
      const response = await fetch("/api/manage/assistant/sessions", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { sessions?: ManageAssistantSession[] } | null;
      const nextSessions = response.ok && Array.isArray(payload?.sessions) ? payload.sessions : [];
      if (response.ok) setSessions(nextSessions);
      return nextSessions;
    } catch {
      // The assistant remains usable if history is temporarily unavailable.
      return [];
    }
  }

  async function selectSession(sessionId: string) {
    try {
      const response = await fetch(`/api/manage/assistant/sessions/${sessionId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as {
        session?: ManageAssistantSession;
        messages?: AssistantMessage[];
        error?: string;
      } | null;
      if (!response.ok || !payload?.session) throw new Error(payload?.error || "Conversation unavailable.");
      setActiveSessionId(payload.session.id);
      setMessages(payload.messages ?? []);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Conversation unavailable.");
    }
  }

  useEffect(() => {
    if (!open) return;
    const initialQuestionText = initialQuestion?.trim();
    const initialQuestionTimer = initialQuestionText
      ? window.setTimeout(() => setInput(initialQuestionText), 0)
      : undefined;
    const loadTimer = window.setTimeout(() => {
      void loadSuggestions();
      void (async () => {
        const availableSessions = await loadSessions();
        const sessionToOpen = initialSessionId || availableSessions[0]?.id;
        if (sessionToOpen) await selectSession(sessionToOpen);
      })();
    }, 0);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 320);
    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(focusTimer);
      if (initialQuestionTimer) window.clearTimeout(initialQuestionTimer);
    };
    // Suggestions refresh whenever the operator opens the drawer or changes CRM sections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, initialSessionId, open, section]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) resizeAssistantComposer(textarea);
  }, [input]);

  function clearConversation() {
    setMessages([]);
    setActiveSessionId(null);
    setInput("");
    setAttachmentName(null);
    setAttachmentFile(null);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    setError(null);
    setConversationRevision((current) => current + 1);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeAssistant() {
    onClose();
  }

  useEffect(() => {
    if (open) return;
    const resetTimer = window.setTimeout(() => {
      setMode("drawer");
      setLiveSuggestionsCollapsed(false);
    }, 280);
    return () => window.clearTimeout(resetTimer);
  }, [open]);

  async function sendQuestion(question: string, file: File | null = attachmentFile) {
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 2 || sending) return;
    const userMessage: AssistantMessage = {
      id: messageId(),
      role: "user",
      content: cleanQuestion,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setSending(true);
    try {
      const requestBody = file
        ? (() => {
            const form = new FormData();
            form.set("question", cleanQuestion);
            form.set("section", section);
            if (detailId) form.set("detailId", detailId);
            if (activeSessionId) form.set("sessionId", activeSessionId);
            form.set("file", file);
            return form;
          })()
        : JSON.stringify({
            question: cleanQuestion,
            section,
            detailId,
            sessionId: activeSessionId,
          });
      const response = await fetch("/api/manage/assistant", {
        method: "POST",
        ...(file ? {} : { headers: { "Content-Type": "application/json" } }),
        body: requestBody,
      });
      const payload = (await response.json().catch(() => null)) as
        | { answer?: string; sources?: ManageAssistantSource[]; session?: ManageAssistantSession; error?: string }
        | null;
      if (!response.ok || !payload?.answer)
        throw new Error(payload?.error || "Costivra could not answer that question.");
      const answer = payload.answer;
      if (payload.session) {
        setActiveSessionId(payload.session.id);
        setSessions((current) => [payload.session!, ...current.filter((session) => session.id !== payload.session!.id)].slice(0, 20));
      }
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content: answer,
          sources: payload.sources ?? [],
        },
      ]);
      if (file) {
        setAttachmentName(null);
        setAttachmentFile(null);
        if (attachmentInputRef.current) attachmentInputRef.current.value = "";
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Costivra could not answer that question.");
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(input);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion(input);
    }
  }

  const renderSuggestion = (suggestion: ManageAssistantSuggestion) => {
    const Icon = icons[suggestion.kind];
    return (
      <button
        type="button"
        key={suggestion.id}
        className="assistant-welcome-prompt manage-assistant-suggestion"
        onClick={() => void sendQuestion(suggestion.prompt)}
      >
        <span className="manage-assistant-suggestion-icon"><Icon size={16} /></span>
        <span className="assistant-welcome-prompt-copy">
          <strong>{suggestion.label}</strong>
          <small>{suggestion.detail}</small>
        </span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </button>
    );
  };

  return (
    <>
      <button
        type="button"
        className={`manage-assistant-scrim${open ? " is-open" : ""}`}
        aria-label="Close Ask Costivra"
        onClick={closeAssistant}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className={`assistant-surface manage-assistant${open ? " is-open" : ""}${isFullscreen ? " assistant-fullscreen-surface" : " assistant-drawer-surface"}`}
        data-mode={mode}
        data-history={liveSuggestionsCollapsed ? "collapsed" : "open"}
        aria-label="Ask Costivra"
        aria-hidden={!open}
      >
        <AssistantWorkspaceHeader
          subtitle={`Grounded in ${contextLabel}`}
          leading={isFullscreen ? (
            <AssistantIconButton
              label={liveSuggestionsCollapsed ? "Show live suggestions" : "Collapse live suggestions"}
              onClick={() => setLiveSuggestionsCollapsed((current) => !current)}
            >
              {liveSuggestionsCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </AssistantIconButton>
          ) : undefined}
          actions={
            <>
              <AssistantIconButton label="New conversation" onClick={clearConversation}>
                <Plus size={16} />
              </AssistantIconButton>
              <AssistantIconButton label="Refresh live suggestions" onClick={() => void loadSuggestions()} disabled={loadingSuggestions}>
                <RefreshCw size={16} className={loadingSuggestions ? "is-spinning" : ""} />
              </AssistantIconButton>
              <AssistantIconButton
                label={isFullscreen ? "Exit full screen" : "Expand to full screen"}
                onClick={() => setMode((current) => current === "fullscreen" ? "drawer" : "fullscreen")}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </AssistantIconButton>
              <AssistantIconButton className="workspace-close-button" label="Close assistant" onClick={closeAssistant}>
                <X size={16} />
              </AssistantIconButton>
            </>
          }
        />

        <div className="assistant-main-container manage-assistant-main-container">
          {isFullscreen && (
            <aside className={`assistant-rail manage-assistant-live-rail${liveSuggestionsCollapsed ? " is-collapsed" : ""}`} aria-label="Conversation history" aria-hidden={liveSuggestionsCollapsed}>
              <div className="assistant-rail-heading">
                <div>
                  <span>Conversations</span>
                  <small>Previous Costivra reviews</small>
                </div>
                <span>{sessions.length}</span>
              </div>
              <div className="assistant-history-search">
                <Search size={14} aria-hidden="true" />
                <input
                  className="assistant-history-search-input"
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder="Search history..."
                  disabled={liveSuggestionsCollapsed}
                  tabIndex={liveSuggestionsCollapsed ? -1 : 0}
                  aria-label="Search conversation history"
                />
              </div>
              <div className="assistant-session-list">
                {sessions
                  .filter((session) => `${session.title} ${session.lastMessagePreview ?? ""}`.toLowerCase().includes(historyQuery.toLowerCase()))
                  .map((session) => (
                    <button
                      type="button"
                      key={session.id}
                      className={`assistant-session-row manage-assistant-session-row${session.id === activeSessionId ? " is-active" : ""}`}
                      onClick={() => void selectSession(session.id)}
                      disabled={liveSuggestionsCollapsed}
                      tabIndex={liveSuggestionsCollapsed ? -1 : 0}
                    >
                      <MessageSquare size={14} aria-hidden="true" />
                      <span>
                        <strong>{session.title}</strong>
                        <small>{session.lastMessagePreview || "New conversation"}</small>
                      </span>
                    </button>
                  ))}
                {!sessions.length && <p className="assistant-history-empty">No recent conversations yet.</p>}
              </div>
            </aside>
          )}

          <div className="assistant-canvas manage-assistant-canvas">
            <div className="manage-assistant-body">
              {!messages.length && (
                <section className="assistant-welcome manage-assistant-welcome" aria-label="Suggested questions">
                  <div className="assistant-welcome-mark"><CostivraAssistantIcon size={36} /></div>
                  <span className="assistant-welcome-eyebrow">Live client operations</span>
                  <h3>What needs attention?</h3>
                  <p>Start with a record-backed prompt, or ask a focused question about clients, mail, or follow-ups.</p>
                  <div className="assistant-welcome-prompts">
                    {loadingSuggestions && !suggestions.length ? (
                      <p className="assistant-welcome-loading">Finding the most useful place to start…</p>
                    ) : suggestions.map((suggestion) => renderSuggestion(suggestion))}
                  </div>
                </section>
              )}

              {(messages.length > 0 || sending || error) && (
              <div className="assistant-thread manage-assistant-messages" aria-live="polite" key={conversationRevision}>
                {messages.map((message) => message.role === "user" ? (
                  <div className="assistant-message assistant-message--user" key={message.id}>
                    <div className="user-bubble">{message.content}</div>
                  </div>
                ) : (
                  <div className="assistant-message assistant-message--assistant" key={message.id}>
                    <div className="assistant-prose">
                      <div className="manage-assistant-message-heading">
                        <CostivraAssistantIcon size={20} aria-hidden="true" />
                        <strong>Costivra</strong>
                      </div>
                      <p>{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="manage-assistant-sources">
                          <h4>Sources ({message.sources.length})</h4>
                          {message.sources.map((source) => {
                            const Icon = icons[source.kind];
                            return (
                              <Link href={source.href} key={source.id}>
                                <Icon size={15} />
                                <span><strong>{source.label}</strong><small>{source.detail}</small></span>
                                <ArrowUpRight size={14} />
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="assistant-thinking" role="status">
                    <span className="assistant-thinking-mark" aria-hidden="true"><CostivraAssistantIcon size={20} /></span>
                    <div className="assistant-thinking-copy"><strong>Costivra is reviewing live records</strong><span><i /><i /><i /></span></div>
                    <span className="sr-only">Costivra is reviewing live records.</span>
                  </div>
                )}
                {error && <p className="manage-assistant-error" role="alert">{error}</p>}
                <div ref={messagesEndRef} />
              </div>
              )}
            </div>

            <footer className="assistant-composer-wrap manage-assistant-footer">
              <form onSubmit={submit}>
                <input
                  ref={attachmentInputRef}
                  className="sr-only"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setAttachmentFile(file);
                    setAttachmentName(file?.name ?? null);
                  }}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                {attachmentName && (
                  <div className="manage-assistant-attachment-chip" role="status">
                    <Paperclip size={13} aria-hidden="true" />
                    <span>{attachmentName}</span>
                    <button type="button" onClick={() => { setAttachmentName(null); setAttachmentFile(null); if (attachmentInputRef.current) attachmentInputRef.current.value = ""; }} aria-label="Remove attachment">×</button>
                  </div>
                )}
                <AssistantComposerShell>
                  <AssistantIconButton label="Attach document" onClick={() => attachmentInputRef.current?.click()}>
                    <Paperclip size={17} />
                  </AssistantIconButton>
                  <textarea
                    ref={inputRef}
                    className="assistant-composer-textarea"
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value.slice(0, 2_000));
                      resizeAssistantComposer(event.currentTarget);
                    }}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="Ask about clients, mail, or follow-ups"
                    rows={1}
                    disabled={sending}
                    aria-label="Ask Costivra a question"
                  />
                  <button className="manage-assistant-send" type="submit" disabled={sending || input.trim().length < 2} aria-label="Send question">
                    <Send size={16} />
                  </button>
                </AssistantComposerShell>
              </form>
              <p className="sr-only">Answers use live CRM records. Review before taking action.</p>
            </footer>
          </div>
        </div>
      </aside>
    </>
  );
}
