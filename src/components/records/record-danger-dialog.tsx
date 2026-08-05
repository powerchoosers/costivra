"use client";

import { useState, ReactNode } from "react";
import { AlertTriangle, ShieldAlert, LoaderCircle, X } from "lucide-react";

export type DangerActionMode = "archive" | "deactivate" | "end" | "remove" | "permanent-delete";

export type DependencyPreview = {
  blocked: boolean;
  blockReason?: string;
  counts: Array<{ label: string; count: number }>;
};

export type RecordDangerDialogProps = {
  isOpen: boolean;
  mode: DangerActionMode;
  recordTitle: string;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  dependencyPreview?: DependencyPreview | null;
  loadingPreview?: boolean;
  requiredConfirmationText?: string;
  customMessage?: ReactNode;
};

const modeTitles: Record<DangerActionMode, string> = {
  archive: "Archive Account",
  deactivate: "Deactivate Contact",
  end: "End Vendor Relationship",
  remove: "Remove Vendor from Workspace",
  "permanent-delete": "Permanently Delete Record",
};

const modeButtonLabels: Record<DangerActionMode, string> = {
  archive: "Archive Account",
  deactivate: "Deactivate Contact",
  end: "End Relationship",
  remove: "Remove from Workspace",
  "permanent-delete": "Permanently Delete",
};

export function RecordDangerDialog({
  isOpen,
  mode,
  recordTitle,
  onClose,
  onConfirm,
  dependencyPreview = null,
  loadingPreview = false,
  requiredConfirmationText,
  customMessage,
}: RecordDangerDialogProps) {
  const [typedInput, setTypedInput] = useState("");
  const [reason, setReason] = useState("");
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const requiresTyping = Boolean(requiredConfirmationText);
  const confirmationMatched = !requiresTyping || typedInput.trim().toLowerCase() === requiredConfirmationText?.trim().toLowerCase();
  const isBlocked = dependencyPreview?.blocked;

  const handleConfirm = async () => {
    if (isBlocked || !confirmationMatched || executing) return;
    setExecuting(true);
    setError(null);
    try {
      await onConfirm(reason);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 1300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "recordOverlayFadeIn 180ms ease-out both",
      }}
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={modeTitles[mode]}
        style={{
          width: "min(480px, 100%)",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: "recordModalScaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: mode === "archive" || mode === "deactivate" || mode === "end" ? "var(--assistant-warning-soft, #fff8ed)" : "var(--assistant-danger-soft, #fff3f3)",
              color: mode === "archive" || mode === "deactivate" || mode === "end" ? "var(--assistant-warning, #a96818)" : "var(--assistant-danger, #c44b4b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {mode === "archive" || mode === "deactivate" || mode === "end" ? <AlertTriangle size={20} /> : <ShieldAlert size={20} />}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--assistant-text, #0f172a)", margin: 0 }}>
              {modeTitles[mode]}
            </h3>
            <span style={{ fontSize: "0.84rem", color: "var(--assistant-muted, #64748b)", display: "block", marginTop: 2 }}>
              Target: <strong>{recordTitle}</strong>
            </span>
          </div>

          <button
            type="button"
            className="assistant-icon-btn"
            onClick={onClose}
            title="Cancel"
            style={{ width: 32, height: 32 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Custom Message / Explanation */}
        {customMessage && <div style={{ fontSize: "0.86rem", color: "var(--assistant-text, #0f172a)", lineHeight: 1.5 }}>{customMessage}</div>}

        {/* Dependency Preview */}
        {loadingPreview ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, borderRadius: 8, background: "var(--assistant-bg, #f8fafc)", fontSize: "0.82rem", color: "var(--assistant-muted, #64748b)" }}>
            <LoaderCircle size={14} className="spin" /> Checking record dependencies...
          </div>
        ) : dependencyPreview ? (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: isBlocked ? "var(--assistant-danger-soft, #fff3f3)" : "var(--assistant-bg, #f8fafc)",
              border: isBlocked ? "1px solid rgba(196, 75, 75, 0.2)" : "1px solid rgba(30, 41, 59, 0.10)",
              fontSize: "0.82rem",
            }}
          >
            {isBlocked ? (
              <div style={{ color: "var(--assistant-danger, #c44b4b)" }}>
                <strong style={{ display: "block", marginBottom: 4 }}>Removal Blocked</strong>
                <span>{dependencyPreview.blockReason}</span>
              </div>
            ) : (
              <div>
                <strong style={{ display: "block", color: "var(--assistant-text, #0f172a)", marginBottom: 6 }}>
                  Linked Dependencies
                </strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {dependencyPreview.counts.map((item) => (
                    <span
                      key={item.label}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "#ffffff",
                        border: "1px solid rgba(30, 41, 59, 0.12)",
                        fontWeight: 600,
                        color: "var(--assistant-text-secondary, #475569)",
                      }}
                    >
                      {item.label}: {item.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Optional Typed Confirmation */}
        {requiresTyping && !isBlocked && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--assistant-text-secondary, #475569)" }}>
              To confirm, type <strong>{requiredConfirmationText}</strong> below:
            </label>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={requiredConfirmationText}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "0.88rem",
                borderRadius: 8,
                border: "1px solid rgba(30, 41, 59, 0.2)",
                outline: "none",
              }}
            />
          </div>
        )}

        {/* Reason Input for Audit Trail */}
        {!isBlocked && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "0.78rem", color: "var(--assistant-muted, #64748b)" }}>
              Reason for audit log (optional):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. End of contract period / Duplicate record cleanup"
              style={{
                width: "100%",
                padding: "6px 10px",
                fontSize: "0.82rem",
                borderRadius: 6,
                border: "1px solid rgba(30, 41, 59, 0.14)",
                outline: "none",
              }}
            />
          </div>
        )}

        {error && (
          <span style={{ fontSize: "0.8rem", color: "var(--assistant-danger, #c44b4b)" }}>
            {error}
          </span>
        )}

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={executing}
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
            type="button"
            onClick={handleConfirm}
            disabled={isBlocked || !confirmationMatched || executing}
            style={{
              padding: "8px 18px",
              fontSize: "0.86rem",
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              background:
                isBlocked || !confirmationMatched || executing
                  ? "rgba(196, 75, 75, 0.35)"
                  : mode === "archive" || mode === "deactivate" || mode === "end"
                  ? "var(--assistant-warning, #a96818)"
                  : "var(--assistant-danger, #c44b4b)",
              color: "#ffffff",
              cursor: isBlocked || !confirmationMatched || executing ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {executing ? <LoaderCircle size={14} className="spin" /> : modeButtonLabels[mode]}
          </button>
        </div>
      </div>
    </div>
  );
}
