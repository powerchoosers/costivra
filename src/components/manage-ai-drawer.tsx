"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CalendarClock,
  ChevronRight,
  Mail,
  MessageSquareText,
  RefreshCw,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { CostivraAssistantIcon } from "@/components/assistant-icon";
import type {
  ManageAssistantSource,
  ManageAssistantSuggestion,
} from "@/lib/manage/assistant";

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
}: {
  open: boolean;
  onClose: () => void;
  section: string;
  detailId?: string | null;
}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [suggestions, setSuggestions] = useState<ManageAssistantSuggestion[]>([]);
  const [contextLabel, setContextLabel] = useState("Client operations");
  const [input, setInput] = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationRevision, setConversationRevision] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const loadTimer = window.setTimeout(() => void loadSuggestions(), 0);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 320);
    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(focusTimer);
    };
    // Suggestions refresh whenever the operator opens the drawer or changes CRM sections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, section]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function sendQuestion(question: string) {
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 2 || sending) return;
    const userMessage: AssistantMessage = {
      id: messageId(),
      role: "user",
      content: cleanQuestion,
    };
    const previousMessages = messages;
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/manage/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          section,
          detailId,
          history: previousMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { answer?: string; sources?: ManageAssistantSource[]; error?: string }
        | null;
      if (!response.ok || !payload?.answer)
        throw new Error(payload?.error || "Costivra could not answer that question.");
      const answer = payload.answer;
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content: answer,
          sources: payload.sources ?? [],
        },
      ]);
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

  return (
    <>
      <button
        type="button"
        className={`manage-assistant-scrim${open ? " is-open" : ""}`}
        aria-label="Close Ask Costivra"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className={`manage-assistant${open ? " is-open" : ""}`}
        aria-label="Ask Costivra"
        aria-hidden={!open}
      >
        <header className="manage-assistant-header">
          <span className="manage-assistant-brand" aria-hidden="true">
            <CostivraAssistantIcon size={42} />
          </span>
          <div>
            <h2>Ask Costivra</h2>
            <p>Grounded in live client operations</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Ask Costivra">
            <X size={18} />
          </button>
        </header>

        <div className="manage-assistant-context">
          <span><MessageSquareText size={14} /> {contextLabel}</span>
          <button
            type="button"
            onClick={() => void loadSuggestions()}
            disabled={loadingSuggestions}
            aria-label="Refresh suggestions"
            title="Refresh suggestions"
          >
            <RefreshCw size={15} className={loadingSuggestions ? "is-spinning" : ""} />
          </button>
        </div>

        <div className="manage-assistant-body">
          {!messages.length && (
            <section className="manage-assistant-suggestions" aria-label="Suggested questions">
              <div className="manage-assistant-section-heading">
                <h3>What needs attention</h3>
                <span>Live data</span>
              </div>
              {loadingSuggestions && !suggestions.length ? (
                <div className="manage-assistant-loading" aria-label="Loading suggestions">
                  <i /><i /><i />
                </div>
              ) : (
                suggestions.map((suggestion) => {
                  const Icon = icons[suggestion.kind];
                  return (
                    <button
                      type="button"
                      key={suggestion.id}
                      onClick={() => void sendQuestion(suggestion.prompt)}
                    >
                      <span><Icon size={16} /></span>
                      <div>
                        <strong>{suggestion.label}</strong>
                        <small>{suggestion.detail}</small>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  );
                })
              )}
            </section>
          )}

          <div className="manage-assistant-messages" aria-live="polite" key={conversationRevision}>
            {messages.map((message, index) => (
              <article className={`manage-assistant-message is-${message.role}`} key={message.id} style={{ "--message-index": index } as CSSProperties}>
                <header>
                  {message.role === "assistant" && (
                    <span aria-hidden="true"><CostivraAssistantIcon size={28} /></span>
                  )}
                  <strong>{message.role === "user" ? "You" : "Costivra"}</strong>
                </header>
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
              </article>
            ))}
            {sending && (
              <div className="manage-assistant-thinking" role="status">
                <span aria-hidden="true"><CostivraAssistantIcon size={28} /></span>
                <div><i /><i /><i /></div>
                <span className="sr-only">Costivra is reviewing live records.</span>
              </div>
            )}
            {error && <p className="manage-assistant-error" role="alert">{error}</p>}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="manage-assistant-footer">
          {messages.length > 0 && (
            <button
              type="button"
              className="manage-assistant-new-chat"
              onClick={() => { setMessages([]); setError(null); setConversationRevision((current) => current + 1); inputRef.current?.focus(); }}
            >
              New conversation
            </button>
          )}
          <form onSubmit={submit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 2_000))}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask about clients, mail, or follow-ups"
              rows={1}
              disabled={sending}
              aria-label="Ask Costivra a question"
            />
            <button type="submit" disabled={sending || input.trim().length < 2} aria-label="Send question">
              <Send size={17} />
            </button>
          </form>
          <p>Answers use live CRM records. Review before taking action.</p>
        </footer>
      </aside>
    </>
  );
}
