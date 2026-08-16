"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { BillBreakdownModal } from "@/components/bill-breakdown-modal";

type BillInspectorContextValue = {
  activeDocumentId: string | null;
  documentIds: string[];
  openInspector: (documentId: string, documentIds?: string[]) => void;
  closeInspector: () => void;
  navigateToDocument: (documentId: string) => void;
};

const BillInspectorContext = createContext<BillInspectorContextValue | null>(null);

export function BillInspectorProvider({ children }: { children: ReactNode }) {
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [activeDocumentIds, setActiveDocumentIds] = useState<string[]>([]);

  const openInspector = useCallback((documentId: string, documentIds?: string[]) => {
    if (documentId) {
      setActiveDocumentId(documentId);
      if (documentIds && documentIds.length > 0) {
        setActiveDocumentIds(documentIds);
      } else {
        setActiveDocumentIds([documentId]);
      }
    }
  }, []);

  const navigateToDocument = useCallback((documentId: string) => {
    if (documentId) {
      setActiveDocumentId(documentId);
    }
  }, []);

  const closeInspector = useCallback(() => {
    setActiveDocumentId(null);
    setActiveDocumentIds([]);
  }, []);

  return (
    <BillInspectorContext.Provider
      value={{
        activeDocumentId,
        documentIds: activeDocumentIds,
        openInspector,
        closeInspector,
        navigateToDocument,
      }}
    >
      {children}
      <BillBreakdownModal
        documentId={activeDocumentId}
        documentIds={activeDocumentIds}
        onClose={closeInspector}
        onNavigateDocument={navigateToDocument}
      />
    </BillInspectorContext.Provider>
  );
}

export function useBillInspector() {
  const ctx = useContext(BillInspectorContext);
  if (!ctx) throw new Error("useBillInspector must be used inside BillInspectorProvider");
  return ctx;
}
