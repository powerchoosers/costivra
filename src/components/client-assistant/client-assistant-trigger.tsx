"use client";

import { CostivraAssistantIcon } from "@/components/assistant-icon";
import { useClientAssistant } from "./client-assistant-provider";

export function ClientAssistantTrigger() {
  const { state, openDrawer, closeAssistant } = useClientAssistant();
  const isOpen = state.mode !== "closed";

  return (
    <button
      type="button"
      className={`button button-quiet assistant-trigger-btn-circle ${isOpen ? "active" : ""}`}
      onClick={() => (isOpen ? closeAssistant() : openDrawer())}
      aria-expanded={isOpen}
      aria-label="Ask Costivra assistant"
      title="Ask Costivra (Cmd+Shift+K)"
      style={{
        position: "relative",
        borderRadius: "50%",
        width: 40,
        height: 40,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: isOpen ? "var(--assistant-accent)" : "#ffffff",
        border: "1px solid #e2e8f0",
        cursor: "pointer",
        transition: "all 180ms ease",
      }}
    >
      <CostivraAssistantIcon size={26} />
    </button>
  );
}
