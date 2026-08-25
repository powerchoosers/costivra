"use client";

import { useEffect, useState } from "react";
import { WorkspaceLoadingScreen } from "@/components/workspace-loading-screen";

type WorkspaceInitialLoadProps = {
  workspace: "app" | "manage";
};

/**
 * Opens once with the persistent workspace layout, then leaves after the
 * browser's first paint. Soft route changes preserve this component's hidden
 * state, so ordinary App and Manage navigation never replays the overlay.
 */
export function WorkspaceInitialLoad({ workspace }: WorkspaceInitialLoadProps) {
  const [phase, setPhase] = useState<"open" | "closing" | "closed">("open");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPhase("closing"));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (phase === "closed") return null;

  return (
    <div
      className={`workspace-initial-load${phase === "closing" ? " is-closing" : ""}`}
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target && phase === "closing") {
          setPhase("closed");
        }
      }}
    >
      <WorkspaceLoadingScreen workspace={workspace} />
    </div>
  );
}
