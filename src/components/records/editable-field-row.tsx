"use client";

import { useState, useRef, ReactNode, KeyboardEvent } from "react";
import { Copy, Check, Edit2, ClipboardPaste, LoaderCircle } from "lucide-react";

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

export function EditableFieldRow({
  label,
  value,
  displayValue,
  editable = true,
  copyable = true,
  pasteable = false,
  input = { kind: "text" },
  onSave,
  source,
}: EditableFieldRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState<string>(String(value ?? ""));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchActionsOpen, setTouchActionsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  const normalizedValue = value != null ? String(value) : "";
  const renderedValue = displayValue ?? (normalizedValue || <span style={{ color: "var(--assistant-muted, #94a3b8)", fontStyle: "italic" }}>—</span>);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!normalizedValue) return;
    try {
      await navigator.clipboard.writeText(normalizedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handlePasteToDraft = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const text = await navigator.clipboard.readText();
      setDraftValue(text);
      setIsEditing(true);
    } catch {
      setError("Clipboard read permission denied");
    }
  };

  const handleStartEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!editable) return;
    setDraftValue(normalizedValue);
    setError(null);
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setDraftValue(normalizedValue);
  };

  const handleSave = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draftValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    } else if (e.key === "Enter" && input.kind !== "textarea") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && input.kind === "textarea") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      className="editable-field-row"
      tabIndex={0}
      data-actions-open={touchActionsOpen}
      onClick={() => setTouchActionsOpen((prev) => !prev)}
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontSize: "0.74rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            color: "var(--assistant-muted, #64748b)",
          }}
        >
          {label}
        </span>
        {source && (
          <span
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
        )}
      </div>

      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          {input.kind === "enum" ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
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
              {input.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : input.kind === "textarea" ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
              rows={3}
              maxLength={input.maxLength}
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
              type={input.kind === "number" ? "number" : input.kind === "url" ? "url" : input.kind === "email" ? "email" : "text"}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
              min={input.kind === "number" ? input.min : undefined}
              max={input.kind === "number" ? input.max : undefined}
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

          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            {error && (
              <span style={{ fontSize: "0.75rem", color: "var(--assistant-danger, #c44b4b)", marginRight: "auto" }}>
                {error}
              </span>
            )}
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
              onClick={handleSave}
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
        <div style={{ position: "relative", minWidth: 0, width: "100%" }}>
          <div
            className="editable-field-row__value"
            style={{
              fontSize: "0.88rem",
              fontWeight: 500,
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
            style={{
              position: "absolute",
              top: "50%",
              right: 0,
              transform: "translateY(-50%) translateX(4px)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              paddingLeft: 18,
              background: "linear-gradient(90deg, transparent 0%, #ffffff 32%)",
              visibility: "hidden",
              opacity: 0,
              pointerEvents: "none",
              transition: "all 140ms ease",
            }}
          >
            {copyable && normalizedValue && (
              <button
                type="button"
                className="assistant-icon-btn"
                onClick={handleCopy}
                title={`Copy ${label}`}
                aria-label={`Copy ${label}`}
                style={{ width: 28, height: 28 }}
              >
                {copied ? <Check size={14} style={{ color: "var(--assistant-success, #138a62)" }} /> : <Copy size={14} />}
              </button>
            )}

            {editable && pasteable && (
              <button
                type="button"
                className="assistant-icon-btn"
                onClick={handlePasteToDraft}
                title={`Paste to draft ${label}`}
                aria-label={`Paste to draft ${label}`}
                style={{ width: 28, height: 28 }}
              >
                <ClipboardPaste size={14} />
              </button>
            )}

            {editable && (
              <button
                type="button"
                className="assistant-icon-btn"
                onClick={handleStartEdit}
                title={`Edit ${label}`}
                aria-label={`Edit ${label}`}
                style={{ width: 28, height: 28 }}
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
