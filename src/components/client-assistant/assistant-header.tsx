"use client";

import { Plus, History, Maximize2, Minimize2, X, PanelLeftClose, PanelLeftOpen } from "@/lib/icons";
import { AssistantIconButton, AssistantWorkspaceHeader } from "@/components/assistant-workspace";
import { useClientAssistant } from "./client-assistant-provider";

export function AssistantHeader() {
  const {
    state,
    closeAssistant,
    toggleHistory,
    toggleFullscreenHistory,
    createSession,
    openFullscreen,
    openDrawer,
  } = useClientAssistant();

  const isFullscreen = state.mode === "fullscreen";
  const historyCollapsed = state.fullscreenHistoryCollapsed;

  return (
    <AssistantWorkspaceHeader
      subtitle={state.currentContext ? `${state.currentContext.kind}: ${state.currentContext.id.slice(0, 8)}` : undefined}
      leading={isFullscreen ? (
        <AssistantIconButton
          label={historyCollapsed ? "Show conversation history" : "Collapse conversation history"}
          onClick={toggleFullscreenHistory}
        >
          {historyCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </AssistantIconButton>
      ) : undefined}
      actions={
        <>
          <AssistantIconButton label="New conversation" onClick={createSession}>
            <Plus size={16} />
          </AssistantIconButton>
          {!isFullscreen && (
            <AssistantIconButton label="Conversation history" onClick={toggleHistory}>
              <History size={16} />
            </AssistantIconButton>
          )}
          <AssistantIconButton
            label={isFullscreen ? "Exit full screen" : "Expand to full screen"}
            onClick={() => (isFullscreen ? openDrawer() : openFullscreen())}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </AssistantIconButton>
          <AssistantIconButton label="Close assistant" onClick={closeAssistant}>
            <X size={16} />
          </AssistantIconButton>
        </>
      }
    />
  );
}
