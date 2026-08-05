"use client";

import { useState, ReactNode, FormEvent } from "react";
import { X, LoaderCircle, AlertTriangle } from "lucide-react";

export type EditRecordSheetProps = {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  isDirty?: boolean;
  saving?: boolean;
  error?: string | null;
  children: ReactNode;
};

export function EditRecordSheet({
  title,
  subtitle,
  isOpen,
  onClose,
  onSave,
  isDirty = false,
  saving = false,
  error = null,
  children,
}: EditRecordSheetProps) {
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  if (!isOpen) return null;

  const handleRequestClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSave();
  };

  return (
    <div
      className="record-sheet-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.35)",
        backdropFilter: "blur(4px)",
        zIndex: 1200,
        display: "flex",
        justifyContent: "flex-end",
        animation: "recordOverlayFadeIn 200ms ease-out both",
      }}
      onClick={handleRequestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="record-sheet-container"
        style={{
          width: "min(540px, 100vw)",
          height: "100vh",
          background: "#ffffff",
          boxShadow: "-20px 0 50px rgba(15, 23, 42, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "recordSheetSlideIn 260ms cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(30, 41, 59, 0.10)",
            background: "#ffffff",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--assistant-text, #0f172a)", margin: 0 }}>
              {title}
            </h2>
            {subtitle && (
              <span style={{ fontSize: "0.8rem", color: "var(--assistant-muted, #64748b)", display: "block", marginTop: 2 }}>
                {subtitle}
              </span>
            )}
          </div>
          <button
            type="button"
            className="assistant-icon-btn"
            onClick={handleRequestClose}
            title="Close edit sheet"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form id="record-sheet-form" onSubmit={handleFormSubmit} style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 10,
                background: "var(--assistant-danger-soft, #fff3f3)",
                border: "1px solid rgba(196, 75, 75, 0.2)",
                color: "var(--assistant-danger, #c44b4b)",
                fontSize: "0.85rem",
                marginBottom: 20,
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ display: "block" }}>Update Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {children}
        </form>

        {/* Unsaved Changes Warning Banner */}
        {showConfirmClose && (
          <div
            style={{
              padding: "12px 20px",
              background: "var(--assistant-warning-soft, #fff8ed)",
              borderTop: "1px solid rgba(169, 104, 24, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.84rem",
              color: "var(--assistant-warning, #a96818)",
            }}
          >
            <span>You have unsaved changes. Discard them?</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowConfirmClose(false)}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.78rem",
                  borderRadius: 6,
                  border: "1px solid rgba(169, 104, 24, 0.3)",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  background: "var(--assistant-danger, #c44b4b)",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Sticky Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 24px",
            borderTop: "1px solid rgba(30, 41, 59, 0.10)",
            background: "var(--assistant-surface-subtle, #fbfcfe)",
          }}
        >
          <span style={{ fontSize: "0.78rem", color: "var(--assistant-muted, #64748b)" }}>
            {isDirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={saving}
              style={{
                padding: "8px 16px",
                fontSize: "0.86rem",
                borderRadius: 8,
                border: "1px solid rgba(30, 41, 59, 0.16)",
                background: "#ffffff",
                color: "var(--assistant-text, #0f172a)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="record-sheet-form"
              disabled={saving || !isDirty}
              style={{
                padding: "8px 20px",
                fontSize: "0.86rem",
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                background: saving || !isDirty ? "rgba(0, 47, 167, 0.35)" : "var(--assistant-accent, #002FA7)",
                color: "#ffffff",
                cursor: saving || !isDirty ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {saving ? <LoaderCircle size={14} className="spin" /> : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
