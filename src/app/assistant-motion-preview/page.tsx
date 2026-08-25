"use client";

import { useState } from "react";
import "@/components/client-assistant/client-assistant.css";

function Conversation({ active, manage = false }: { active: boolean; manage?: boolean }) {
  const conversationClass = manage ? "manage-dashboard-assistant__conversation" : "dashboard-assistant__conversation";
  const composerClass = manage ? "manage-dashboard-assistant__form" : "dashboard-assistant__composer";

  return (
    <div className={`${conversationClass}${active ? " is-active" : ""}`}>
      {active ? (
        <div className="assistant-conversation-scroller">
          <div className={manage ? "manage-dashboard-assistant__thread" : "assistant-thread"}>
            <div className={manage ? "manage-dashboard-assistant__message" : "assistant-message assistant-message--assistant"}>
              <strong>Costivra</strong>
              <p>Here is the evidence-backed answer, with the next step kept in view.</p>
            </div>
          </div>
        </div>
      ) : null}
      <div className={composerClass}>
        <div className="assistant-composer-shell">
          <textarea className="assistant-composer-textarea" rows={1} placeholder="Ask Costivra" readOnly />
          <button type="button" className="assistant-send" aria-label="Preview send" />
        </div>
      </div>
    </div>
  );
}

export default function AssistantMotionPreview() {
  const [appActive, setAppActive] = useState(false);
  const [manageActive, setManageActive] = useState(false);

  return (
    <main style={{ width: "min(980px, 100%)", margin: "0 auto", padding: 32 }}>
      <button type="button" onClick={() => setAppActive((value) => !value)}>Toggle App conversation</button>
      <section className={`dashboard-assistant${appActive ? " dashboard-assistant--active" : ""}`}>
        <div className="dashboard-assistant__identity"><h2>App dashboard</h2><p>Shared customer assistant motion.</p></div>
        <Conversation active={appActive} />
      </section>
      <div data-marker="app">Content after App chat</div>

      <button type="button" onClick={() => setManageActive((value) => !value)}>Toggle Manage conversation</button>
      <section className={`manage-dashboard-assistant${manageActive ? " manage-dashboard-assistant--active" : ""}`}>
        <div className="manage-dashboard-assistant__copy"><h2>Manage dashboard</h2><p>Shared operations assistant motion.</p></div>
        <Conversation active={manageActive} manage />
      </section>
      <div data-marker="manage">Content after Manage chat</div>
    </main>
  );
}
