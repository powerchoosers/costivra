import type { ReactNode } from "react";
import { ManageComposerProvider } from "@/components/manage-portal";
import { NavigationHistoryProvider } from "@/components/navigation-history";

export default function ManageLayout({ children }: { children: ReactNode }) {
  return <NavigationHistoryProvider scope="manage"><ManageComposerProvider>{children}</ManageComposerProvider></NavigationHistoryProvider>;
}
