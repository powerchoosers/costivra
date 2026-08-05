"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { BillBreakdownModal } from "@/components/bill-breakdown-modal";

type BillInspectorContextValue = {
  activeDocumentId: string | null;
  openInspector: (documentId: string) => void;
  closeInspector: () => void;
};

const BillInspectorContext = createContext<BillInspectorContextValue | null>(null);

export function BillInspectorProvider({ children }: { children: ReactNode }) {
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const openInspector = useCallback((documentId: string) => {
    if (documentId) {
      setActiveDocumentId(documentId);
    }
  }, []);

  const closeInspector = useCallback(() => {
    setActiveDocumentId(null);
  }, []);

  return (
    <BillInspectorContext.Provider value={{ activeDocumentId, openInspector, closeInspector }}>
      {children}
      <BillBreakdownModal documentId={activeDocumentId} onClose={closeInspector} />
    </BillInspectorContext.Provider>
  );
}

export function useBillInspector() {
  const ctx = useContext(BillInspectorContext);
  if (!ctx) throw new Error("useBillInspector must be used inside BillInspectorProvider");
  return ctx;
}
