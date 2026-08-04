"use client";

import { useState } from "react";
import { Search, Pin, Archive, MessageSquare } from "lucide-react";
import { useClientAssistant } from "./client-assistant-provider";

export function ConversationRail() {
  const { state, selectSession } = useClientAssistant();
  const [query, setQuery] = useState("");

  const filtered = state.sessions.filter((s) =>
    s.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <aside className="assistant-rail">
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--assistant-muted)" }} />
        <input
          type="text"
          placeholder="Search history..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 10px 6px 30px",
            fontSize: "0.82rem",
            borderRadius: 8,
            border: "1px solid var(--assistant-border)",
            background: "#ffffff",
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.map((s) => {
          const isActive = s.id === state.activeSessionId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSession(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                background: isActive ? "var(--assistant-accent-soft)" : "transparent",
                color: isActive ? "var(--assistant-accent)" : "var(--assistant-text)",
                fontWeight: isActive ? 600 : 400,
                fontSize: "0.84rem",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <MessageSquare size={14} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.title}
              </span>
              {s.pinnedAt && <Pin size={12} style={{ color: "var(--assistant-accent)" }} />}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ fontSize: "0.78rem", color: "var(--assistant-muted)", textAlign: "center", marginTop: 20 }}>
            No conversations found.
          </p>
        )}
      </div>
    </aside>
  );
}
