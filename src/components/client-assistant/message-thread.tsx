"use client";

import { CostivraAssistantIcon } from "@/components/assistant-icon";
import { ResponseBlockRenderer } from "./response-block-renderer";
import { useClientAssistant } from "./client-assistant-provider";
import { FileText, ArrowRight } from "@/lib/icons";
import { AssistantConversationScroller } from "@/components/assistant-conversation-scroller";
import { type CSSProperties } from "react";

export function MessageThread() {
  const { state, sendMessage } = useClientAssistant();
  const messages = state.messages;
  const fallbackPrompts = [
    "Summarize our latest recurring expenses.",
    "Which contracts have notice deadlines approaching?",
    "Where did recurring spend increase most?",
  ];

  if (messages.length === 0) {
    return (
      <div className="assistant-welcome" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "24px 20px", textAlign: "center" }}>
        <div className="assistant-welcome-mark">
          <CostivraAssistantIcon size={36} />
        </div>
        <span className="assistant-welcome-eyebrow">Your records, in context</span>
        <h3>What would you like to review?</h3>
        <p>
          Search your Costivra records, understand what changed, or open the evidence behind a finding.
        </p>
        <div className="assistant-welcome-prompts" aria-live="polite">
          {state.suggestionsLoading && !state.suggestions.length ? (
            <p className="assistant-welcome-loading">Finding the most useful place to start…</p>
          ) : state.suggestions.length ? (
            state.suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="assistant-welcome-prompt"
                onClick={() => sendMessage(suggestion.prompt)}
              >
                <span className="assistant-welcome-prompt-copy">
                  <strong>{suggestion.label}</strong>
                  <small>{suggestion.detail}</small>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))
          ) : (
            fallbackPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="assistant-welcome-prompt"
                onClick={() => sendMessage(prompt)}
              >
                <span className="assistant-welcome-prompt-copy"><strong>{prompt}</strong></span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
      <AssistantConversationScroller
        className="assistant-thread"
        itemCount={messages.length}
        isLoading={state.sending}
        conversationKey={state.activeSessionId ?? "new"}
      >
      {messages.map((m, index) => (
        <div key={m.id} className={`assistant-message assistant-message--${m.role}`} style={{ "--message-index": index } as CSSProperties}>
          {m.role === "user" ? (
            <div className="user-bubble">{m.content}</div>
          ) : (
            <div className="assistant-prose">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <CostivraAssistantIcon size={20} />
                <strong style={{ fontSize: "0.85rem" }}>Costivra</strong>
              </div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.content}</p>

              {/* Render Hydrated Response Blocks */}
              {m.blocks && m.blocks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {m.blocks.map((block, blockIndex) => (
                    <div
                      className="assistant-response-block"
                      key={block.id}
                      style={{ "--assistant-card-index": blockIndex } as CSSProperties}
                    >
                      <ResponseBlockRenderer block={block} />
                    </div>
                  ))}
                </div>
              )}

              {/* Citations */}
              {m.citations && m.citations.length > 0 && (
                <div className="assistant-citations">
                  {m.citations.map((c) => c.href ? (
                    <a
                      key={c.id}
                      href={c.href}
                      className="assistant-citation"
                    >
                      <FileText size={12} /> {c.title}
                    </a>
                  ) : (
                    <span key={c.id} className="assistant-citation assistant-citation--muted">
                      <FileText size={12} /> {c.title}
                    </span>
                  ))}
                </div>
              )}

              {m.missingInformation && m.missingInformation.length > 0 && (
                <div className="assistant-missing-information" role="note">
                  <strong>What is still unknown</strong>
                  <ul>
                    {m.missingInformation.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}

              {/* Follow-up Suggestions */}
              {m.followUps && m.followUps.length > 0 && (
                <div className="assistant-follow-ups">
                  {m.followUps.map((f) => (
                    <button
                      className="assistant-follow-up"
                      key={f}
                      type="button"
                      onClick={() => sendMessage(f)}
                    >
                      <span>{f}</span>
                      <ArrowRight aria-hidden="true" className="assistant-follow-up__arrow" size={13} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {state.sending && (
        <div className="assistant-thinking" role="status">
          <span className="assistant-thinking-mark"><CostivraAssistantIcon size={20} /></span>
          <div className="assistant-thinking-copy"><strong>Costivra is reviewing your records</strong><span><i /><i /><i /></span></div>
          <span className="sr-only">Costivra is preparing a response.</span>
        </div>
      )}
      </AssistantConversationScroller>
  );
}
