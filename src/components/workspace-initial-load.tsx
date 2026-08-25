"use client";

import { type ReactNode, useEffect, useState } from "react";
import { WorkspaceLoadingScreen } from "@/components/workspace-loading-screen";

type WorkspaceInitialLoadProps = {
  children: ReactNode;
  workspace: "app" | "manage";
};

/**
 * Opens once with the persistent workspace layout, then leaves after the
 * browser's first paint. Soft route changes preserve this component's hidden
 * state, so ordinary App and Manage navigation never replays the overlay.
 */
export function WorkspaceInitialLoad({ children, workspace }: WorkspaceInitialLoadProps) {
  const [phase, setPhase] = useState<"open" | "closing" | "closed">("open");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPhase("closing"));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      {phase !== "closed" ? (
        <div
          className={`workspace-initial-load${phase === "closing" ? " is-closing" : ""}`}
          data-phase={phase}
          onAnimationEnd={(event) => {
            if (phase === "closing" && event.animationName === "workspace-initial-load-out") {
              setPhase("closed");
            }
          }}
        >
          <WorkspaceLoadingScreen workspace={workspace} />
        </div>
      ) : null}
      <div
        aria-hidden={phase === "closed" ? undefined : true}
        className={`workspace-initial-load-content${phase === "closed" ? " is-ready" : ""}`}
        data-workspace-entry={phase === "closed" ? "ready" : "waiting"}
      >
        {children}
      </div>
    </>
  );
}
