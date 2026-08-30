"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AlertTriangle, LoaderCircle, X } from "@/lib/icons";
import { lockWorkspaceModalScroll } from "@/lib/ui/workspace-modal-scroll-lock";

export type EditRecordSheetProps = {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  isDirty?: boolean;
  saving?: boolean;
  error?: string | null;
  onReloadLatest?: () => void;
  onKeepDraft?: () => void;
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
  onReloadLatest,
  onKeepDraft,
  children,
}: EditRecordSheetProps) {
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(isOpen);
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

  if (isOpen !== previousOpen) {
    setPreviousOpen(isOpen);
    setShowConfirmClose(false);
  }

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

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releasePageScroll = lockWorkspaceModalScroll();

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
      releasePageScroll();
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

  const describedBy = [subtitle ? subtitleId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div
      className="workspace-record-sheet__overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleRequestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className="workspace-record-sheet"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="workspace-record-sheet__header">
          <div className="workspace-record-sheet__heading">
            <h2 id={titleId} className="workspace-record-sheet__title">
              {title}
            </h2>
            {subtitle ? (
              <span id={subtitleId} className="workspace-record-sheet__subtitle">
                {subtitle}
              </span>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="workspace-close-button workspace-record-icon-button workspace-record-sheet__close"
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
          className="workspace-record-sheet__body"
        >
          {error ? (
            <div
              id={errorId}
              role="alert"
              aria-live="assertive"
              className="workspace-record-sheet__alert workspace-record-sheet__alert--error"
            >
              <AlertTriangle
                size={18}
                aria-hidden="true"
                className="workspace-record-sheet__alert-icon"
              />
              <div className="workspace-record-sheet__alert-content">
                <strong className="workspace-record-sheet__alert-title">Update error</strong>
                <span className="workspace-record-sheet__alert-message">{error}</span>
                {error.includes("changed in another session") ? (
                  <div className="workspace-record-sheet__alert-actions">
                    <button
                      type="button"
                      className="workspace-record-button workspace-record-button--quiet workspace-record-button--small"
                      onClick={onReloadLatest}
                      disabled={!onReloadLatest}
                    >
                      Reload latest
                    </button>
                    <button
                      type="button"
                      className="workspace-record-button workspace-record-button--quiet workspace-record-button--small"
                      onClick={onKeepDraft}
                    >
                      Keep my draft
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {children}
        </form>

        {showConfirmClose ? (
          <div role="alert" className="workspace-record-sheet__discard-confirm">
            <span className="workspace-record-sheet__discard-message">
              You have unsaved changes. Discard them?
            </span>
            <div className="workspace-record-sheet__discard-actions">
              <button
                type="button"
                className="workspace-record-button workspace-record-button--warning-quiet workspace-record-button--small"
                onClick={() => setShowConfirmClose(false)}
              >
                Keep editing
              </button>
              <button
                type="button"
                className="workspace-record-button workspace-record-button--danger workspace-record-button--small"
                onClick={discardChanges}
              >
                Discard
              </button>
            </div>
          </div>
        ) : null}

        <div className="workspace-record-sheet__footer">
          <span
            role="status"
            aria-live="polite"
            className="workspace-record-sheet__save-status"
            data-state={saving ? "saving" : isDirty ? "dirty" : "saved"}
          >
            {saving ? "Saving changes" : isDirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <div className="workspace-record-sheet__footer-actions">
            <button
              type="button"
              className="workspace-record-button workspace-record-button--secondary"
              onClick={handleRequestClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              className="workspace-record-button workspace-record-button--primary"
              disabled={saving || !isDirty}
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
