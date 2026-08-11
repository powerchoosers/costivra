"use client";

import { useState, type CSSProperties } from "react";
import { Search, Pin, MessageSquare } from "@/lib/icons";
import { useClientAssistant } from "./client-assistant-provider";

export function ConversationRail({ collapsed = false }: { collapsed?: boolean }) {
  const { state, selectSession } = useClientAssistant();
  const [query, setQuery] = useState("");

  const filtered = state.sessions.filter((s) =>
    s.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <aside className={`assistant-rail${collapsed ? " is-collapsed" : ""}`} aria-hidden={collapsed}>
      <div className="assistant-rail-heading">
        <div>
          <span>Conversations</span>
          <small>Previous Costivra reviews</small>
        </div>
        <span>{filtered.length}</span>
      </div>
      <div className="assistant-history-search">
        <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--assistant-muted)" }} />
        <input
          type="text"
          placeholder="Search history..."
          value={query}
          disabled={collapsed}
          tabIndex={collapsed ? -1 : 0}
          onChange={(e) => setQuery(e.target.value)}
          className="assistant-history-search-input"
        />
      </div>
      <div className="assistant-session-list">
        {filtered.map((s, index) => {
          const isActive = s.id === state.activeSessionId;
          return (
            <button
              key={s.id}
              type="button"
              className="assistant-session-row"
              onClick={() => selectSession(s.id)}
              disabled={collapsed}
              tabIndex={collapsed ? -1 : 0}
              style={{
                "--session-index": index,
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
              } as CSSProperties}
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
