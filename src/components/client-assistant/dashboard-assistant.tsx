"use client";

import { AssistantComposer } from "./assistant-composer";
import { useClientAssistant } from "./client-assistant-provider";

/**
 * Command Center entry point for the existing scoped assistant. It deliberately
 * reuses the same provider, upload path, chat sessions, and response drawer so
 * the dashboard never becomes a separate or less-governed chat experience.
 */
export function DashboardAssistant() {
  const { openDrawer } = useClientAssistant();

  return (
    <section className="dashboard-assistant" aria-labelledby="dashboard-assistant-title">
      <div className="dashboard-assistant__identity">
        <h2 id="dashboard-assistant-title">What would you like to look into?</h2>
        <p>Ask about a vendor, bill, contract, finding, or the work that needs attention.</p>
      </div>

      <AssistantComposer
        className="dashboard-assistant__composer"
        onMessageSubmitted={openDrawer}
      />
    </section>
  );
}
