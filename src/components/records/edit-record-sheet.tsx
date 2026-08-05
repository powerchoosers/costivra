"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";

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

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const dirtyRef = useRef(isDirty);
  const savingRef = useRef(saving);
  const confirmRef = useRef(showConfirmClose);
  const formId = useId();
  const titleId = useId();
  const subtitleId = useId();
  const errorId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  useEffect(() => {
    confirmRef.current = showConfirmClose;
  }, [showConfirmClose]);

  useEffect(() => {
    if (!isOpen) return;

    setShowConfirmClose(false);
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      const initial = dialogRef.current?.querySelector<HTMLElement>(
        "input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled])",
      );
      (initial ?? closeButtonRef.current ?? dialogRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;

      if (event.key === "Escape") {
        event.preventDefault();
        if (savingRef.current) return;
        if (confirmRef.current) {
          setShowConfirmClose(false);
        } else if (dirtyRef.current) {
          setShowConfirmClose(true);
        } else {
          onCloseRef.current();
        }
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
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestClose = () => {
    if (saving) return;
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleFormSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isDirty || saving) return;
    await onSave();
  };

  const discardChanges = () => {
    setShowConfirmClose(false);
    onClose();
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
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleRequestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        aria-errormessage={error ? errorId : undefined}
        tabIndex={-1}
        className="record-sheet-container"
        style={{
          width: "min(540px, 100vw)",
          height: "100dvh",
          background: "#ffffff",
          boxShadow: "-20px 0 50px rgba(15, 23, 42, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "recordSheetSlideIn 260ms cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
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
            <h2
              id={titleId}
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--assistant-text, #0f172a)",
                margin: 0,
              }}
            >
              {title}
            </h2>
            {subtitle ? (
              <span
                id={subtitleId}
                style={{
                  fontSize: "0.8rem",
                  color: "var(--assistant-muted, #64748b)",
                  display: "block",
                  marginTop: 2,
                }}
              >
                {subtitle}
              </span>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="assistant-icon-btn"
            onClick={handleRequestClose}
            disabled={saving}
            aria-label={`Close ${title}`}
            title="Close edit sheet"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form
          id={formId}
          onSubmit={handleFormSubmit}
          style={{ flex: 1, overflowY: "auto", padding: "24px" }}
        >
          {error ? (
            <div
              id={errorId}
              role="alert"
              aria-live="assertive"
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
              <AlertTriangle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ display: "block" }}>Update error</strong>
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          {children}
        </form>

        {showConfirmClose ? (
          <div
            role="alert"
            style={{
              padding: "12px 20px",
              background: "var(--assistant-warning-soft, #fff8ed)",
              borderTop: "1px solid rgba(169, 104, 24, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: "0.84rem",
              color: "var(--assistant-warning, #a96818)",
            }}
          >
            <span>You have unsaved changes. Discard them?</span>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
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
                Keep editing
              </button>
              <button
                type="button"
                onClick={discardChanges}
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
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 24px",
            borderTop: "1px solid rgba(30, 41, 59, 0.10)",
            background: "var(--assistant-surface-subtle, #fbfcfe)",
          }}
        >
          <span
            role="status"
            aria-live="polite"
            style={{ fontSize: "0.78rem", color: "var(--assistant-muted, #64748b)" }}
          >
            {saving ? "Saving changes" : isDirty ? "Unsaved changes" : "All changes saved"}
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
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              disabled={saving || !isDirty}
              style={{
                padding: "8px 20px",
                fontSize: "0.86rem",
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                background:
                  saving || !isDirty
                    ? "rgba(0, 47, 167, 0.35)"
                    : "var(--assistant-accent, #002FA7)",
                color: "#ffffff",
                cursor: saving || !isDirty ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {saving ? (
                <>
                  <LoaderCircle size={14} className="spin" aria-hidden="true" /> Saving
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
