"use client";

import { useClientAssistant } from "./client-assistant-provider";
import { AssistantHeader } from "./assistant-header";
import { ConversationRail } from "./conversation-rail";
import { MessageThread } from "./message-thread";
import { AssistantComposer } from "./assistant-composer";
import "./client-assistant.css";

export function ClientAssistantSurface() {
  const { state } = useClientAssistant();

  if (state.mode === "closed") return null;

  const isFullscreen = state.mode === "fullscreen";
  const showHistoryOnly = !isFullscreen && state.historyOpen;

  return (
    <div className={isFullscreen ? "assistant-fullscreen-surface" : "assistant-drawer-surface"}>
      <AssistantHeader />
      <div className={`assistant-main-container${showHistoryOnly ? " assistant-main-container--history" : ""}`}>
        {(isFullscreen || state.historyOpen) && <ConversationRail />}
        {!showHistoryOnly && (
          <div className="assistant-canvas">
            <MessageThread key={`${state.activeSessionId ?? "new"}-${state.viewRevision}`} />
            <AssistantComposer />
          </div>
        )}
      </div>
    </div>
  );
}
