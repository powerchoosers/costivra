"use client";

import { useEffect, useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, X, LoaderCircle } from "@/lib/icons";
import { AssistantComposerShell, AssistantIconButton } from "@/components/assistant-workspace";
import { resizeAssistantComposer } from "@/lib/ui/assistant-composer";
import { useClientAssistant } from "./client-assistant-provider";

export function AssistantComposer({
  className,
  onMessageSubmitted,
}: {
  className?: string;
  onMessageSubmitted?: () => void;
}) {
  const { state, sendMessage, uploadAttachment, removeAttachment } = useClientAssistant();
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    resizeAssistantComposer(textarea);
  }, [text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!canSend || state.sending) return;
    const msg = text;
    setText("");
    onMessageSubmitted?.();
    void sendMessage(msg);
  };

  const hasUploadingAttachment = state.pendingAttachments.some((attachment) => attachment.status === "uploading");
  const hasBlockedAttachment = state.pendingAttachments.some((attachment) => attachment.status !== "processed");
  const hasReadyAttachment = state.pendingAttachments.some((attachment) => attachment.status === "processed" && attachment.documentId);
  const canSend = Boolean(text.trim() || hasReadyAttachment) && !hasUploadingAttachment && !hasBlockedAttachment;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      uploadAttachment(files[i]);
    }
    e.target.value = "";
  };

  return (
    <div className={["assistant-composer-wrap", className].filter(Boolean).join(" ")}>
      {/* Pending Attachments Tray */}
      {state.pendingAttachments.length > 0 && (
        <div className="assistant-attachment-tray">
          {state.pendingAttachments.map((a) => (
            <div
              key={a.clientUploadId}
              className="assistant-attachment-chip"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                borderRadius: 6,
                background: "var(--assistant-accent-soft)",
                fontSize: "0.78rem",
                color: "var(--assistant-accent)",
              }}
            >
              <span>{a.filename}</span>
              {a.status === "uploading" ? (
                <LoaderCircle size={12} className="spin" />
              ) : (
                <button
                  type="button"
                  onClick={() => removeAttachment(a.clientUploadId)}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <AssistantComposerShell>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          style={{ display: "none" }}
          accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
        />
        <AssistantIconButton
          label="Attach a PDF, DOCX, TXT, PNG, or JPG document"
          onClick={() => fileInputRef.current?.click()}
          style={{ marginBottom: 4 }}
        >
          <Paperclip size={18} />
        </AssistantIconButton>

        <textarea
          ref={textareaRef}
          className={`assistant-composer-textarea${text.length > 0 ? " has-content" : ""}`}
          placeholder="Ask a question or upload a bill to review..."
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            resizeAssistantComposer(e.currentTarget);
          }}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend || state.sending}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: "none",
            background: !canSend || state.sending ? "rgba(0,47,167,0.3)" : "var(--assistant-accent)",
            color: "#ffffff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: !canSend || state.sending ? "not-allowed" : "pointer",
            flexShrink: 0,
            transition: "all 160ms ease",
          }}
          title="Send prompt"
        >
          {state.sending ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}
        </button>
      </AssistantComposerShell>
    </div>
  );
}
