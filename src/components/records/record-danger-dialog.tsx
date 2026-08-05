"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, LoaderCircle, ShieldAlert, X } from "lucide-react";

export type DangerActionMode =
  | "archive"
  | "deactivate"
  | "end"
  | "remove"
  | "permanent-delete";

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
  previewError?: string | null;
  onRetryPreview?: () => void;
  requiresPreview?: boolean;
  requiresReason?: boolean;
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

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function RecordDangerDialog({
  isOpen,
  mode,
  recordTitle,
  onClose,
  onConfirm,
  dependencyPreview = null,
  loadingPreview = false,
  previewError = null,
  onRetryPreview,
  requiresPreview,
  requiresReason,
  requiredConfirmationText,
  customMessage,
}: RecordDangerDialogProps) {
  const [typedInput, setTypedInput] = useState("");
  const [reason, setReason] = useState("");
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const executingRef = useRef(executing);
  const titleId = useId();
  const descriptionId = useId();
  const confirmationId = useId();
  const reasonId = useId();

  const previewIsRequired =
    requiresPreview ?? (mode === "remove" || mode === "permanent-delete");
  const reasonIsRequired =
    requiresReason ??
    (mode === "archive" ||
      mode === "end" ||
      mode === "remove" ||
      mode === "permanent-delete");
  const typingIsRequired = Boolean(requiredConfirmationText);
  const confirmationMatched =
    !typingIsRequired ||
    typedInput.trim().toLowerCase() ===
      requiredConfirmationText?.trim().toLowerCase();
  const removalBlocked = Boolean(dependencyPreview?.blocked);
  const previewUnavailable =
    previewIsRequired &&
    !loadingPreview &&
    !dependencyPreview &&
    !previewError;
  const previewFailed = previewIsRequired && Boolean(previewError);
  const reasonMissing = reasonIsRequired && !reason.trim();
  const confirmationDisabled =
    loadingPreview ||
    previewUnavailable ||
    previewFailed ||
    removalBlocked ||
    !confirmationMatched ||
    reasonMissing ||
    executing;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    executingRef.current = executing;
  }, [executing]);

  useEffect(() => {
    if (!isOpen) return;

    setTypedInput("");
    setReason("");
    setError(null);
    setExecuting(false);
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      (cancelButtonRef.current ?? dialogRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;

      if (event.key === "Escape") {
        event.preventDefault();
        if (!executingRef.current) onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter(
        (element) =>
          element.getAttribute("aria-hidden") !== "true" &&
          element.getClientRects().length > 0,
      );

      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isOpen, mode, recordTitle]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (confirmationDisabled) return;
    setExecuting(true);
    setError(null);
    try {
      await onConfirm(reason.trim() || undefined);
      onClose();
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "The action could not be completed.",
      );
    } finally {
      setExecuting(false);
    }
  };

  const warningMode =
    mode === "archive" || mode === "deactivate" || mode === "end";

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
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !executing) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        style={{
          width: "min(480px, 100%)",
          maxHeight: "min(720px, calc(100dvh - 40px))",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: "recordModalScaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: warningMode
                ? "var(--assistant-warning-soft, #fff8ed)"
                : "var(--assistant-danger-soft, #fff3f3)",
              color: warningMode
                ? "var(--assistant-warning, #a96818)"
                : "var(--assistant-danger, #c44b4b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {warningMode ? (
              <AlertTriangle size={20} aria-hidden="true" />
            ) : (
              <ShieldAlert size={20} aria-hidden="true" />
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h3
              id={titleId}
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--assistant-text, #0f172a)",
                margin: 0,
              }}
            >
              {modeTitles[mode]}
            </h3>
            <span
              id={descriptionId}
              style={{
                fontSize: "0.84rem",
                color: "var(--assistant-muted, #64748b)",
                display: "block",
                marginTop: 2,
              }}
            >
              Target: <strong>{recordTitle}</strong>
            </span>
          </div>

          <button
            type="button"
            className="assistant-icon-btn"
            onClick={onClose}
            disabled={executing}
            aria-label={`Cancel ${modeTitles[mode]}`}
            title="Cancel"
            style={{ width: 32, height: 32 }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {customMessage ? (
          <div
            style={{
              fontSize: "0.86rem",
              color: "var(--assistant-text, #0f172a)",
              lineHeight: 1.5,
            }}
          >
            {customMessage}
          </div>
        ) : null}

        {loadingPreview ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 12,
              borderRadius: 8,
              background: "var(--assistant-bg, #f8fafc)",
              fontSize: "0.82rem",
              color: "var(--assistant-muted, #64748b)",
            }}
          >
            <LoaderCircle size={14} className="spin" aria-hidden="true" />
            Checking record dependencies
          </div>
        ) : previewError ? (
          <div
            role="alert"
            style={{
              padding: 12,
              borderRadius: 10,
              background: "var(--assistant-danger-soft, #fff3f3)",
              border: "1px solid rgba(196, 75, 75, 0.2)",
              color: "var(--assistant-danger, #c44b4b)",
              fontSize: "0.82rem",
            }}
          >
            <strong style={{ display: "block", marginBottom: 4 }}>
              Dependency check failed
            </strong>
            <span>{previewError}</span>
            {onRetryPreview ? (
              <button
                type="button"
                onClick={onRetryPreview}
                style={{
                  display: "block",
                  marginTop: 10,
                  padding: "5px 10px",
                  border: "1px solid rgba(196, 75, 75, 0.3)",
                  borderRadius: 6,
                  color: "inherit",
                  background: "#ffffff",
                  fontWeight: 600,
                }}
              >
                Retry check
              </button>
            ) : null}
          </div>
        ) : previewUnavailable ? (
          <div
            role="alert"
            style={{
              padding: 12,
              borderRadius: 10,
              background: "var(--assistant-danger-soft, #fff3f3)",
              border: "1px solid rgba(196, 75, 75, 0.2)",
              color: "var(--assistant-danger, #c44b4b)",
              fontSize: "0.82rem",
            }}
          >
            <strong style={{ display: "block", marginBottom: 4 }}>
              Dependency check unavailable
            </strong>
            No destructive action can be completed until linked records are checked.
          </div>
        ) : dependencyPreview ? (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: removalBlocked
                ? "var(--assistant-danger-soft, #fff3f3)"
                : "var(--assistant-bg, #f8fafc)",
              border: removalBlocked
                ? "1px solid rgba(196, 75, 75, 0.2)"
                : "1px solid rgba(30, 41, 59, 0.10)",
              fontSize: "0.82rem",
            }}
          >
            {removalBlocked ? (
              <div role="alert" style={{ color: "var(--assistant-danger, #c44b4b)" }}>
                <strong style={{ display: "block", marginBottom: 4 }}>
                  Removal blocked
                </strong>
                <span>{dependencyPreview.blockReason}</span>
              </div>
            ) : (
              <div>
                <strong
                  style={{
                    display: "block",
                    color: "var(--assistant-text, #0f172a)",
                    marginBottom: 6,
                  }}
                >
                  Linked dependencies
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

        {typingIsRequired && !removalBlocked ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor={confirmationId}
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--assistant-text-secondary, #475569)",
              }}
            >
              To confirm, type <strong>{requiredConfirmationText}</strong> below:
            </label>
            <input
              id={confirmationId}
              type="text"
              value={typedInput}
              onChange={(event) => setTypedInput(event.target.value)}
              placeholder={requiredConfirmationText}
              autoComplete="off"
              disabled={executing}
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
        ) : null}

        {!removalBlocked ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              htmlFor={reasonId}
              style={{
                fontSize: "0.78rem",
                color: "var(--assistant-muted, #64748b)",
              }}
            >
              Reason for audit log{reasonIsRequired ? " (required)" : " (optional)"}
            </label>
            <input
              id={reasonId}
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="End of contract, duplicate cleanup, or another clear reason"
              disabled={executing}
              required={reasonIsRequired}
              aria-invalid={reasonMissing}
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
        ) : null}

        {error ? (
          <span
            role="alert"
            style={{
              fontSize: "0.8rem",
              color: "var(--assistant-danger, #c44b4b)",
            }}
          >
            {error}
          </span>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 8,
          }}
        >
          <button
            ref={cancelButtonRef}
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
              cursor: executing ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={confirmationDisabled}
            aria-disabled={confirmationDisabled}
            style={{
              padding: "8px 18px",
              fontSize: "0.86rem",
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              background: confirmationDisabled
                ? "rgba(196, 75, 75, 0.35)"
                : warningMode
                  ? "var(--assistant-warning, #a96818)"
                  : "var(--assistant-danger, #c44b4b)",
              color: "#ffffff",
              cursor: confirmationDisabled ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {executing ? (
              <>
                <LoaderCircle size={14} className="spin" aria-hidden="true" /> Working
              </>
            ) : (
              modeButtonLabels[mode]
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
