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
      <span
        style={{
          color: "var(--assistant-muted, #94a3b8)",
          fontStyle: "italic",
        }}
      >
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
      className="editable-field-row"
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
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "6px 8px",
        borderRadius: 8,
        minWidth: 0,
        transition: "background 140ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <label
          htmlFor={isEditing ? fieldId : undefined}
          className={!showLabel ? "sr-only" : undefined}
          style={{
            fontSize: "0.74rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            color: "var(--assistant-muted, #64748b)",
          }}
        >
          {label}
        </label>
        {source ? (
          <span
            id={sourceId}
            title={sourceLabels[source]}
            style={{
              fontSize: "0.68rem",
              padding: "1px 6px",
              borderRadius: 4,
              background: "rgba(0, 47, 167, 0.06)",
              color: "var(--assistant-accent, #002FA7)",
              fontWeight: 500,
            }}
          >
            {sourceLabels[source]}
          </span>
        ) : null}
      </div>

      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
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
              style={{
                width: "100%",
                padding: "6px 10px",
                fontSize: "0.88rem",
                borderRadius: 6,
                border: "1px solid var(--assistant-accent, #002FA7)",
                outline: "none",
                background: "#ffffff",
              }}
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
              style={{
                width: "100%",
                padding: "6px 10px",
                fontSize: "0.88rem",
                borderRadius: 6,
                border: "1px solid var(--assistant-accent, #002FA7)",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
                background: "#ffffff",
              }}
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
              style={{
                width: "100%",
                padding: "6px 10px",
                fontSize: "0.88rem",
                borderRadius: 6,
                border: "1px solid var(--assistant-accent, #002FA7)",
                outline: "none",
                background: "#ffffff",
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "flex-end",
            }}
          >
            {error ? (
              <span
                id={errorId}
                role="alert"
                style={{
                  fontSize: "0.75rem",
                  color: "var(--assistant-danger, #c44b4b)",
                  marginRight: "auto",
                }}
              >
                {error}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              style={{
                padding: "3px 10px",
                fontSize: "0.78rem",
                borderRadius: 6,
                border: "1px solid rgba(30, 41, 59, 0.16)",
                background: "transparent",
                color: "var(--assistant-muted, #64748b)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                padding: "3px 12px",
                fontSize: "0.78rem",
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                background: "var(--assistant-accent, #002FA7)",
                color: "#ffffff",
                cursor: saving ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {saving ? <LoaderCircle size={12} className="spin" /> : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            width: "100%",
          }}
        >
          <div
            className="editable-field-row__value"
            style={{
              order: 2,
              flex: "1 1 auto",
              minWidth: 0,
              fontSize: compact ? "0.68rem" : "0.88rem",
              fontWeight: compact ? 660 : 500,
              color: "var(--assistant-text, #0f172a)",
              whiteSpace: input.kind === "textarea" ? "pre-wrap" : "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {renderedValue}
          </div>

          <div
            className="editable-field-row__actions"
            aria-hidden={!actionsVisible}
            style={{
              order: 1,
              position: "static",
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              paddingLeft: 0,
              background: "none",
              visibility: actionsVisible ? "visible" : "hidden",
              opacity: actionsVisible ? 1 : 0,
              pointerEvents: actionsVisible ? "auto" : "none",
              transition: "opacity 140ms ease, transform 140ms ease",
            }}
          >
            {copyable && normalizedValue ? (
              <button
                type="button"
                className="assistant-icon-btn"
                onClick={handleCopy}
                title={`Copy ${label}`}
                aria-label={`Copy ${label}`}
                tabIndex={actionsVisible ? 0 : -1}
                style={{ width: 28, height: 28 }}
              >
                {copied ? (
                  <Check
                    size={14}
                    aria-hidden="true"
                    style={{ color: "var(--assistant-success, #138a62)" }}
                  />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
              </button>
            ) : null}

            {editable && onSave && pasteable ? (
              <button
                type="button"
                className="assistant-icon-btn"
                onClick={handlePasteToDraft}
                title={`Paste into ${label}`}
                aria-label={`Paste into ${label}`}
                tabIndex={actionsVisible ? 0 : -1}
                style={{ width: 28, height: 28 }}
              >
                <ClipboardPaste size={14} aria-hidden="true" />
              </button>
            ) : null}

            {editable && onSave ? (
              <button
                type="button"
                className="assistant-icon-btn"
                onClick={handleStartEdit}
                title={`Edit ${label}`}
                aria-label={`Edit ${label}`}
                tabIndex={actionsVisible ? 0 : -1}
                style={{ width: 28, height: 28 }}
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
          style={{
            marginTop: 4,
            fontSize: "0.74rem",
            color: "var(--assistant-danger, #c44b4b)",
          }}
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
