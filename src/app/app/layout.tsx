import type { ReactNode } from "react";
import { WorkspaceInitialLoad } from "@/components/workspace-initial-load";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceInitialLoad workspace="app">
      {children}
    </WorkspaceInitialLoad>
  );
}
