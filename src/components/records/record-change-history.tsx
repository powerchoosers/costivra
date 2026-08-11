"use client";

import { Clock, User } from "@/lib/icons";

export type AuditHistoryItem = {
  id: string;
  action: string;
  actorName: string;
  timestamp: string;
  summary: string;
  source?: "customer" | "internal" | "system";
};

export type RecordChangeHistoryProps = {
  history: AuditHistoryItem[];
  emptyMessage?: string;
};

export function RecordChangeHistory({
  history,
  emptyMessage = "No change history recorded yet for this item.",
}: RecordChangeHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div
        style={{
          padding: "32px 20px",
          textAlign: "center",
          background: "var(--assistant-bg, #f8fafc)",
          borderRadius: 12,
          border: "1px solid rgba(30, 41, 59, 0.08)",
          color: "var(--assistant-muted, #64748b)",
          fontSize: "0.86rem",
        }}
      >
        <Clock size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
        <p style={{ margin: 0 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {history.map((item) => {
        const formattedDate = new Date(item.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        return (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 10,
              background: "#ffffff",
              border: "1px solid rgba(30, 41, 59, 0.10)",
              fontSize: "0.85rem",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(0, 47, 167, 0.06)",
                color: "var(--assistant-accent, #002FA7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <User size={16} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ color: "var(--assistant-text, #0f172a)", fontWeight: 650 }}>
                  {item.actorName}
                </strong>
                <span style={{ fontSize: "0.76rem", color: "var(--assistant-muted, #64748b)", flexShrink: 0 }}>
                  {formattedDate}
                </span>
              </div>

              <div style={{ color: "var(--assistant-text-secondary, #475569)", marginTop: 2, lineHeight: 1.4 }}>
                {item.summary}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(30, 41, 59, 0.06)",
                    color: "var(--assistant-muted, #64748b)",
                  }}
                >
                  {item.action}
                </span>
                {item.source && (
                  <span style={{ fontSize: "0.72rem", color: "var(--assistant-muted, #64748b)" }}>
                    • {item.source}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
