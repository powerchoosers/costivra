import type { ReactNode } from "react";
import { ManageComposerProvider } from "@/components/manage-portal";

export default function ManageLayout({ children }: { children: ReactNode }) {
  return <ManageComposerProvider>{children}</ManageComposerProvider>;
}
