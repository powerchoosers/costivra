"use client";

import { CostivraAssistantIcon } from "@/components/assistant-icon";
import { WorkspaceUtilityButton } from "@/components/ui/workspace-primitives";
import { useClientAssistant } from "./client-assistant-provider";

export function ClientAssistantTrigger() {
  const { state, openDrawer, closeAssistant } = useClientAssistant();
  const isOpen = state.mode !== "closed";

  return (
    <WorkspaceUtilityButton
      active={isOpen}
      className={`button button-quiet assistant-trigger-btn-circle ${isOpen ? "active" : ""}`}
      onClick={() => (isOpen ? closeAssistant() : openDrawer())}
      aria-expanded={isOpen}
      aria-label="Ask Costivra assistant"
      title="Ask Costivra (Cmd+Shift+K)"
    >
      <CostivraAssistantIcon size={26} />
    </WorkspaceUtilityButton>
  );
}
