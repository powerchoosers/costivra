import { CostivraMark } from "@/components/brand";

type WorkspaceLoadingScreenProps = {
  workspace: "app" | "manage";
};

const loadingCopy = {
  app: {
    eyebrow: "Cost intelligence",
    title: "Opening your workspace",
    description: "Bringing your expenses, evidence, and next actions into view.",
  },
  manage: {
    eyebrow: "Costivra Manage",
    title: "Opening operations",
    description: "Preparing the records and review queues that need attention.",
  },
} as const;

/**
 * Shared route-level loading screen for the customer and internal workspaces.
 * This is intentionally presentation-only: it does not imply that a specific
 * record, calculation, or review has completed while server data is loading.
 */
export function WorkspaceLoadingScreen({ workspace }: WorkspaceLoadingScreenProps) {
  const copy = loadingCopy[workspace];

  return (
    <main
      aria-busy="true"
      className="workspace-loading-screen"
      data-workspace-shell={workspace === "app" ? "customer-loading" : "manage-loading"}
    >
      <div className="workspace-loading-screen__frame">
        <section
          aria-live="polite"
          className="workspace-loading-screen__canvas"
          role="status"
        >
          <div aria-hidden="true" className="workspace-loading-screen__topbar">
            <i />
            <span />
            <span />
          </div>

          <div className="workspace-loading-screen__content">
            <div aria-hidden="true" className="workspace-loading-screen__signal">
              <span className="workspace-loading-screen__signal-mark">
                <CostivraMark size={48} />
              </span>
              <span className="workspace-loading-screen__signal-line">
                <i />
              </span>
              <span className="workspace-loading-screen__signal-records">
                <i />
                <i />
                <i />
              </span>
            </div>

            <p className="workspace-loading-screen__eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="workspace-loading-screen__description">{copy.description}</p>

            <span aria-hidden="true" className="workspace-loading-screen__progress">
              <i />
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
