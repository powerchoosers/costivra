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

  return (
    <div className={isFullscreen ? "assistant-fullscreen-surface" : "assistant-drawer-surface"}>
      <AssistantHeader />
      <div className="assistant-main-container">
        {(isFullscreen || state.historyOpen) && <ConversationRail />}
        <div className="assistant-canvas">
          <MessageThread />
          <AssistantComposer />
        </div>
      </div>
    </div>
  );
}
