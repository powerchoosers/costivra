"use client";

import { useClientAssistant } from "./client-assistant-provider";
import { AssistantHeader } from "./assistant-header";
import { ConversationRail } from "./conversation-rail";
import { MessageThread } from "./message-thread";
import { AssistantComposer } from "./assistant-composer";
import { X } from "@/lib/icons";
import "./client-assistant.css";

export function ClientAssistantSurface() {
  const { state, closeInspector, finishClosing, finishTransition } = useClientAssistant();

  if (state.mode === "closed" && state.phase === "closed") return null;

  const isFullscreen = state.mode === "fullscreen";
  const showHistoryOnly = !isFullscreen && state.historyOpen;
  const showHistoryRail = isFullscreen && !state.fullscreenHistoryCollapsed;
  const shouldRenderHistoryRail = isFullscreen || state.historyOpen;

  const containerClass = isFullscreen ? "assistant-fullscreen-surface" : "assistant-drawer-surface";

  return (
    <section
      className={`assistant-surface ${containerClass}`}
      data-mode={state.mode}
      data-phase={state.phase}
      data-history={showHistoryRail ? "open" : "collapsed"}
      data-inspector={state.inspectorOpen ? "open" : "closed"}
      aria-label="Ask Costivra"
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (state.phase === "closing" && ["assistantDrawerOut", "assistantFullscreenOut"].includes(event.animationName)) {
          finishClosing();
        }
        if (state.phase === "opening" && ["assistantDrawerIn", "assistantFullscreenIn"].includes(event.animationName)) {
          finishTransition();
        }
        if (state.phase === "transitioning" && event.animationName === "assistantSurfaceMorph") {
          finishTransition();
        }
      }}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && state.phase === "transitioning" && event.propertyName === "width") {
          finishTransition();
        }
      }}
    >
      <AssistantHeader />
      <div className={`assistant-main-container${showHistoryOnly ? " assistant-main-container--history" : ""}`}>
        {shouldRenderHistoryRail && <ConversationRail collapsed={isFullscreen && !showHistoryRail} />}
        {!showHistoryOnly && (
          <div className="assistant-canvas">
            <MessageThread key={`${state.activeSessionId ?? "new"}-${state.viewRevision}`} />
            <AssistantComposer />
          </div>
        )}
        {isFullscreen && state.inspectorOpen && (
          <aside className="assistant-inspector-panel">
            <div className="assistant-inspector-header">
              <strong>Record Inspector</strong>
              <button
                type="button"
                className="assistant-icon-btn workspace-close-button"
                onClick={closeInspector}
                title="Close inspector"
              >
                <X size={16} />
              </button>
            </div>
            <div className="assistant-inspector-body">
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Inspect record provenance, structured fields, and underlying verification sources.
              </p>
              <div className="card-detail-grid" style={{ marginTop: 16 }}>
                <div>
                  <span className="card-detail-label">Selected Block ID</span>
                  <span className="card-detail-value">{state.selectedBlockId}</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
