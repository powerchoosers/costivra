"use client";

import { CostivraMark } from "@/components/brand";
import { ResponseBlockRenderer } from "./response-block-renderer";
import { useClientAssistant } from "./client-assistant-provider";
import { FileText, ArrowRight } from "lucide-react";

export function MessageThread() {
  const { state, sendMessage } = useClientAssistant();
  const messages = state.messages;

  if (messages.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 30, textAlign: "center" }}>
        <CostivraMark size={40} />
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "16px 0 6px" }}>Ask Costivra</h3>
        <p className="muted" style={{ fontSize: "0.85rem", maxWidth: 360, margin: 0 }}>
          Ask questions about your business bills, contracts, and spend, or attach an invoice for an instant review.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24, width: "100%", maxWidth: 340 }}>
          {[
            "Summarize our latest recurring expenses.",
            "Which contracts have notice deadlines approaching?",
            "Where did recurring spend increase most?",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="button button-quiet"
              style={{ fontSize: "0.82rem", textAlign: "left", justifyContent: "flex-start" }}
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
    <div className="assistant-thread">
      {messages.map((m) => (
        <div key={m.id} style={{ display: "flex", flexDirection: "column" }}>
          {m.role === "user" ? (
            <div className="user-bubble">{m.content}</div>
          ) : (
            <div className="assistant-prose">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <CostivraMark size={16} />
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
    </div>
  );
}
