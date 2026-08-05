"use client";

import { CostivraAssistantIcon } from "@/components/assistant-icon";
import { Plus, History, Maximize2, Minimize2, X } from "lucide-react";
import { useClientAssistant } from "./client-assistant-provider";

export function AssistantHeader() {
  const { state, closeAssistant, toggleHistory, createSession, openFullscreen, openDrawer } = useClientAssistant();
  const isFullscreen = state.mode === "fullscreen";

  return (
    <div className="assistant-header-bar">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <CostivraAssistantIcon size={24} />
        <div>
          <strong style={{ fontSize: "0.92rem", display: "block" }}>Ask Costivra</strong>
          {state.currentContext && (
            <span style={{ fontSize: "0.76rem", color: "var(--assistant-muted)" }}>
              {state.currentContext.kind}: {state.currentContext.id.slice(0, 8)}
            </span>
          )}
        </div>
      </div>
      <div className="assistant-header-actions">
        <button
          type="button"
          className="assistant-icon-btn"
          onClick={createSession}
          title="New conversation"
          aria-label="New conversation"
        >
          <Plus size={16} />
        </button>
        {!isFullscreen && (
          <button
            type="button"
            className="assistant-icon-btn"
            onClick={toggleHistory}
            title="Conversation history"
            aria-label="Conversation history"
          >
            <History size={16} />
          </button>
        )}
        <button
          type="button"
          className="assistant-icon-btn"
          onClick={() => (isFullscreen ? openDrawer() : openFullscreen())}
          title={isFullscreen ? "Exit full screen" : "Expand to full screen"}
          aria-label={isFullscreen ? "Exit full screen" : "Expand to full screen"}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          type="button"
          className="assistant-icon-btn"
          onClick={closeAssistant}
          title="Close assistant"
          aria-label="Close assistant"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
