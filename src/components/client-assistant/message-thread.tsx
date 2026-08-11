"use client";

import { CostivraAssistantIcon } from "@/components/assistant-icon";
import { ResponseBlockRenderer } from "./response-block-renderer";
import { useClientAssistant } from "./client-assistant-provider";
import { FileText, ArrowRight } from "@/lib/icons";
import { useEffect, useRef, type CSSProperties } from "react";

export function MessageThread() {
  const { state, sendMessage } = useClientAssistant();
  const messages = state.messages;
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, state.sending]);

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
        <div className="assistant-welcome-prompts">
          {[
            "Summarize our latest recurring expenses.",
            "Which contracts have notice deadlines approaching?",
            "Where did recurring spend increase most?",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="button button-quiet assistant-welcome-prompt"
              style={{ fontSize: "0.8rem", fontWeight: 500, textAlign: "left", justifyContent: "flex-start" }}
              onClick={() => sendMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
      <div className="assistant-thread" aria-live="polite">
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
                  {m.blocks.map((block) => (
                    <ResponseBlockRenderer key={block.id} block={block} />
                  ))}
                </div>
              )}

              {/* Citations */}
              {m.citations && m.citations.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {m.citations.map((c) => (
                    <a
                      key={c.id}
                      href={c.href || "#"}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "rgba(0,0,0,0.04)",
                        color: "var(--assistant-accent)",
                        textDecoration: "none",
                      }}
                    >
                      <FileText size={12} /> {c.title}
                    </a>
                  ))}
                </div>
              )}

              {/* Follow-up Suggestions */}
              {m.followUps && m.followUps.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {m.followUps.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => sendMessage(f)}
                      style={{
                        fontSize: "0.78rem",
                        padding: "4px 10px",
                        borderRadius: 14,
                        border: "1px solid var(--assistant-border)",
                        background: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      {f} <ArrowRight size={10} style={{ marginLeft: 2 }} />
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
      <div ref={threadEndRef} />
    </div>
  );
}
