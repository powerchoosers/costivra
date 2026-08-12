"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, LoaderCircle, ShieldAlert, X } from "@/lib/icons";

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
  const resetKey = `${isOpen ? "open" : "closed"}:${mode}:${recordTitle}`;
  const [previousResetKey, setPreviousResetKey] = useState(resetKey);
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

  if (resetKey !== previousResetKey) {
    setPreviousResetKey(resetKey);
    setTypedInput("");
    setReason("");
    setError(null);
    setExecuting(false);
  }

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
  }, [isOpen]);

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
      className="workspace-record-dialog__overlay"
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
        className="workspace-record-dialog"
        data-tone={warningMode ? "warning" : "danger"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="workspace-record-dialog__header">
          <div
            className="workspace-record-dialog__icon"
            data-tone={warningMode ? "warning" : "danger"}
          >
            {warningMode ? (
              <AlertTriangle size={20} aria-hidden="true" />
            ) : (
              <ShieldAlert size={20} aria-hidden="true" />
            )}
          </div>

          <div className="workspace-record-dialog__heading">
            <h3 id={titleId} className="workspace-record-dialog__title">
              {modeTitles[mode]}
            </h3>
            <span id={descriptionId} className="workspace-record-dialog__description">
              Target: <strong>{recordTitle}</strong>
            </span>
          </div>

          <button
            type="button"
            className="workspace-record-icon-button workspace-record-dialog__close"
            onClick={onClose}
            disabled={executing}
            aria-label={`Cancel ${modeTitles[mode]}`}
            title="Cancel"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {customMessage ? (
          <div className="workspace-record-dialog__message">{customMessage}</div>
        ) : null}

        {loadingPreview ? (
          <div
            role="status"
            aria-live="polite"
            className="workspace-record-dialog__status"
          >
            <LoaderCircle size={14} className="spin" aria-hidden="true" />
            Checking record dependencies
          </div>
        ) : previewError ? (
          <div
            role="alert"
            className="workspace-record-dialog__notice workspace-record-dialog__notice--danger"
          >
            <strong className="workspace-record-dialog__notice-title">
              Dependency check failed
            </strong>
            <span className="workspace-record-dialog__notice-message">{previewError}</span>
            {onRetryPreview ? (
              <button
                type="button"
                className="workspace-record-button workspace-record-button--danger-quiet workspace-record-button--small"
                onClick={onRetryPreview}
              >
                Retry check
              </button>
            ) : null}
          </div>
        ) : previewUnavailable ? (
          <div
            role="alert"
            className="workspace-record-dialog__notice workspace-record-dialog__notice--danger"
          >
            <strong className="workspace-record-dialog__notice-title">
              Dependency check unavailable
            </strong>
            <span className="workspace-record-dialog__notice-message">
              No destructive action can be completed until linked records are checked.
            </span>
          </div>
        ) : dependencyPreview ? (
          <div
            className="workspace-record-dialog__dependencies"
            data-blocked={removalBlocked || undefined}
          >
            {removalBlocked ? (
              <div role="alert" className="workspace-record-dialog__dependency-blocked">
                <strong className="workspace-record-dialog__dependency-title">
                  Removal blocked
                </strong>
                <span className="workspace-record-dialog__dependency-message">
                  {dependencyPreview.blockReason}
                </span>
              </div>
            ) : (
              <div className="workspace-record-dialog__dependency-list">
                <strong className="workspace-record-dialog__dependency-title">
                  Linked dependencies
                </strong>
                <div className="workspace-record-dialog__dependency-counts">
                  {dependencyPreview.counts.map((item) => (
                    <span key={item.label} className="workspace-record-dialog__dependency-count">
                      {item.label}: {item.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {typingIsRequired && !removalBlocked ? (
          <div className="workspace-record-dialog__field">
            <label
              htmlFor={confirmationId}
              className="workspace-record-dialog__label workspace-record-dialog__label--strong"
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
              className="workspace-record-dialog__input workspace-record-dialog__input--confirmation"
            />
          </div>
        ) : null}

        {!removalBlocked ? (
          <div className="workspace-record-dialog__field workspace-record-dialog__field--reason">
            <label
              htmlFor={reasonId}
              className="workspace-record-dialog__label"
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
              className="workspace-record-dialog__input workspace-record-dialog__input--reason"
            />
          </div>
        ) : null}

        {error ? (
          <span role="alert" className="workspace-record-dialog__error">
            {error}
          </span>
        ) : null}

        <div className="workspace-record-dialog__actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="workspace-record-button workspace-record-button--secondary"
            onClick={onClose}
            disabled={executing}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`workspace-record-button workspace-record-button--${warningMode ? "warning" : "danger"}`}
            onClick={() => void handleConfirm()}
            disabled={confirmationDisabled}
            aria-disabled={confirmationDisabled}
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
