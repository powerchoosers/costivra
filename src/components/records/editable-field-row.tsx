"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Check, ClipboardPaste, Copy, Edit2, LoaderCircle } from "@/lib/icons";

export type FieldInputConfig =
  | { kind: "text"; maxLength?: number }
  | { kind: "url" }
  | { kind: "email" }
  | { kind: "phone" }
  | { kind: "textarea"; maxLength?: number }
  | { kind: "date" }
  | { kind: "datetime" }
  | { kind: "number"; min?: number; max?: number }
  | { kind: "enum"; options: Array<{ value: string; label: string }> };

export type EditableFieldRowProps = {
  label: string;
  value: string | number | null;
  displayValue?: ReactNode;
  editable?: boolean;
  copyable?: boolean;
  pasteable?: boolean;
  showLabel?: boolean;
  compact?: boolean;
  input?: FieldInputConfig;
  onSave?: (newValue: unknown) => Promise<void>;
  source?: "customer" | "internal" | "extracted" | "enriched" | "system";
};

const sourceLabels: Record<NonNullable<EditableFieldRowProps["source"]>, string> = {
  customer: "Customer entered",
  internal: "Internal CRM",
  extracted: "Extracted from source",
  enriched: "Public enrichment",
  system: "System derived",
};

function inputType(input: FieldInputConfig) {
  if (input.kind === "number") return "number";
  if (input.kind === "url") return "url";
  if (input.kind === "email") return "email";
  if (input.kind === "phone") return "tel";
  if (input.kind === "date") return "date";
  if (input.kind === "datetime") return "datetime-local";
  return "text";
}

export function EditableFieldRow({
  label,
  value,
  displayValue,
  editable = true,
  copyable = true,
  pasteable = false,
  showLabel = true,
  compact = false,
  input = { kind: "text" },
  onSave,
  source,
}: EditableFieldRowProps) {
  const normalizedValue = value == null ? "" : String(value);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(normalizedValue);
  const [lastNormalizedValue, setLastNormalizedValue] = useState(normalizedValue);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [hovered, setHovered] = useState(false);
  const [focusedWithin, setFocusedWithin] = useState(false);
  const [touchActionsOpen, setTouchActionsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const copiedTimerRef = useRef<number | null>(null);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const sourceId = `${fieldId}-source`;

  if (!isEditing && normalizedValue !== lastNormalizedValue) {
    setLastNormalizedValue(normalizedValue);
    setDraftValue(normalizedValue);
  }

  const renderedValue =
    displayValue ??
    (normalizedValue || (
      <span className="workspace-record-field__empty">
        Not set
      </span>
    ));
  const hasActions = (copyable && Boolean(normalizedValue)) || (editable && Boolean(onSave));
  const actionsVisible =
    !isEditing && hasActions && (hovered || focusedWithin || touchActionsOpen);

  useEffect(() => {
    if (!isEditing) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isEditing]);

  useEffect(() => {
    if (!touchActionsOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setTouchActionsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [touchActionsOpen]);

  useEffect(
    () => () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    },
    [],
  );

  const handleCopy = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!normalizedValue) return;
    try {
      await navigator.clipboard.writeText(normalizedValue);
      setError(null);
      setCopied(true);
      setStatusMessage(`${label} copied.`);
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 1800);
    } catch {
      setError(`Could not copy ${label.toLowerCase()}.`);
      setStatusMessage("");
    }
  };

  const handlePasteToDraft = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      const text = await navigator.clipboard.readText();
      setDraftValue(text);
      setError(null);
      setStatusMessage(`Pasted into ${label.toLowerCase()} draft. Review before saving.`);
      setTouchActionsOpen(false);
      setIsEditing(true);
    } catch {
      setError("Clipboard access was blocked. Paste into the editor manually.");
      setStatusMessage("");
    }
  };

  const handleStartEdit = (event?: ReactMouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    if (!editable || !onSave) return;
    setDraftValue(normalizedValue);
    setError(null);
    setStatusMessage("");
    setTouchActionsOpen(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setStatusMessage("Edit cancelled.");
    setDraftValue(normalizedValue);
  };

  const handleSave = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    setError(null);
    setStatusMessage("");
    try {
      await onSave(draftValue);
      setIsEditing(false);
      setTouchActionsOpen(false);
      setStatusMessage(`${label} saved.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "The change could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditorKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
    } else if (event.key === "Enter" && input.kind !== "textarea") {
      event.preventDefault();
      void handleSave();
    } else if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey) &&
      input.kind === "textarea"
    ) {
      event.preventDefault();
      void handleSave();
    }
  };

  const handleBlurCapture = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
      setFocusedWithin(false);
      setTouchActionsOpen(false);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    if (isEditing || !hasActions) return;
    const target = event.target as Element;
    if (target.closest("button, a, input, select, textarea")) return;
    setTouchActionsOpen((current) => !current);
  };

  const describedBy = [source ? sourceId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div
      ref={rootRef}
      className={`workspace-record-field${compact ? " workspace-record-field--compact" : ""}${isEditing ? " workspace-record-field--editing" : ""}`}
      tabIndex={isEditing ? -1 : 0}
      data-actions-open={touchActionsOpen || undefined}
      aria-label={`${label}: ${normalizedValue || "Not set"}`}
      aria-describedby={describedBy}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusedWithin(true)}
      onBlurCapture={handleBlurCapture}
      onPointerUp={handlePointerUp}
      onKeyDown={(event) => {
        if (!isEditing && event.key === "Escape") {
          setTouchActionsOpen(false);
          setFocusedWithin(false);
        }
      }}
    >
      <div className="workspace-record-field__header">
        <label
          htmlFor={isEditing ? fieldId : undefined}
          className={showLabel ? "workspace-record-field__label" : "workspace-record-field__label sr-only"}
        >
          {label}
        </label>
        {source ? (
          <span
            id={sourceId}
            title={sourceLabels[source]}
            className="workspace-record-field__source"
          >
            {sourceLabels[source]}
          </span>
        ) : null}
      </div>

      {isEditing ? (
        <div className="workspace-record-field__editor">
          {input.kind === "enum" ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              id={fieldId}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              disabled={saving}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="workspace-record-field__input workspace-record-field__input--select"
            >
              {input.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : input.kind === "textarea" ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              id={fieldId}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              disabled={saving}
              rows={3}
              maxLength={input.maxLength}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="workspace-record-field__input workspace-record-field__input--textarea"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              id={fieldId}
              type={inputType(input)}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              disabled={saving}
              min={input.kind === "number" ? input.min : undefined}
              max={input.kind === "number" ? input.max : undefined}
              maxLength={input.kind === "text" ? input.maxLength : undefined}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="workspace-record-field__input"
            />
          )}

          <div className="workspace-record-field__editor-actions">
            {error ? (
              <span
                id={errorId}
                role="alert"
                className="workspace-record-field__error workspace-record-field__error--editor"
              >
                {error}
              </span>
            ) : null}
            <button
              type="button"
              className="workspace-record-button workspace-record-button--quiet workspace-record-button--small"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="workspace-record-button workspace-record-button--primary workspace-record-button--small"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <LoaderCircle size={12} className="spin" /> : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="workspace-record-field__display">
          <div
            className="workspace-record-field__value"
            data-multiline={input.kind === "textarea" || undefined}
          >
            {renderedValue}
          </div>

          <div
            className="workspace-record-field__actions"
            aria-hidden={!actionsVisible}
            data-visible={actionsVisible || undefined}
          >
            {copyable && normalizedValue ? (
              <button
                type="button"
                className="workspace-record-icon-button workspace-record-field__action"
                onClick={handleCopy}
                title={`Copy ${label}`}
                aria-label={`Copy ${label}`}
                tabIndex={actionsVisible ? 0 : -1}
              >
                {copied ? (
                  <Check
                    size={14}
                    aria-hidden="true"
                    className="workspace-record-field__action-icon workspace-record-field__action-icon--success"
                  />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
              </button>
            ) : null}

            {editable && onSave && pasteable ? (
              <button
                type="button"
                className="workspace-record-icon-button workspace-record-field__action"
                onClick={handlePasteToDraft}
                title={`Paste into ${label}`}
                aria-label={`Paste into ${label}`}
                tabIndex={actionsVisible ? 0 : -1}
              >
                <ClipboardPaste size={14} aria-hidden="true" />
              </button>
            ) : null}

            {editable && onSave ? (
              <button
                type="button"
                className="workspace-record-icon-button workspace-record-field__action"
                onClick={handleStartEdit}
                title={`Edit ${label}`}
                aria-label={`Edit ${label}`}
                tabIndex={actionsVisible ? 0 : -1}
              >
                <Edit2 size={14} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {!isEditing && error ? (
        <span
          id={errorId}
          role="alert"
          className="workspace-record-field__error"
        >
          {error}
        </span>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </span>
    </div>
  );
}
