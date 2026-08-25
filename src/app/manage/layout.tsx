import type { ReactNode } from "react";
import { ManageComposerProvider } from "@/components/manage-portal";
import { NavigationHistoryProvider } from "@/components/navigation-history";
import { WorkspaceInitialLoad } from "@/components/workspace-initial-load";

export default function ManageLayout({ children }: { children: ReactNode }) {
  return (
    <NavigationHistoryProvider scope="manage">
      <WorkspaceInitialLoad workspace="manage">
        <ManageComposerProvider>{children}</ManageComposerProvider>
      </WorkspaceInitialLoad>
    </NavigationHistoryProvider>
  );
}
