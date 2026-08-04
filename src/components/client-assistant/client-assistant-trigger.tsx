"use client";

import { CostivraMark } from "@/components/brand";
import { useClientAssistant } from "./client-assistant-provider";

export function ClientAssistantTrigger() {
  const { state, openDrawer, closeAssistant } = useClientAssistant();
  const isOpen = state.mode !== "closed";

  return (
    <button
      type="button"
      className={`assistant-trigger-btn ${isOpen ? "active" : ""}`}
      onClick={() => (isOpen ? closeAssistant() : openDrawer())}
      aria-expanded={isOpen}
      aria-label="Ask Costivra assistant"
      title="Ask Costivra (Cmd+Shift+K)"
    >
      <CostivraMark size={16} />
      <span className="hide-mobile">Ask Costivra</span>
    </button>
  );
}
