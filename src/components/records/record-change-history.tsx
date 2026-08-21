"use client";

import { AlertCircle, Clock, User } from "@/lib/icons";
import { SkeletonBlock } from "@/components/ui/skeletons";
import {
  formatRecordHistoryTimestamp,
  getRecordHistoryDisplayState,
} from "@/lib/records/record-history-presentation";

export type AuditHistoryItem = {
  id: string;
  action: string;
  actorName: string;
  timestamp: string;
  summary: string;
  source?: "customer" | "internal" | "system";
};

export type RecordChangeHistoryProps = {
  error?: string | null;
  history: AuditHistoryItem[];
  emptyMessage?: string;
  loading?: boolean;
  onRetry?: () => void;
};

export function RecordChangeHistory({
  error = null,
  history,
  emptyMessage = "No change history recorded yet for this item.",
  loading = false,
  onRetry,
}: RecordChangeHistoryProps) {
  const state = getRecordHistoryDisplayState(loading, history.length, error);

  if (state === "loading") {
    return (
      <div
        aria-busy="true"
        aria-label="Loading record history"
        className="record-change-history record-change-history--loading"
        role="status"
      >
        {["first", "second", "third"].map((key) => (
          <div className="record-change-history__loading-row" key={key}>
            <SkeletonBlock borderRadius="10px" height={34} width={34} />
            <div>
              <SkeletonBlock height=".75rem" width="42%" />
              <SkeletonBlock height=".65rem" width="78%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="record-change-history record-change-history--error" role="alert">
        <AlertCircle aria-hidden="true" size={20} />
        <p>{error}</p>
        {onRetry ? <button className="button button-secondary" type="button" onClick={onRetry}>Try again</button> : null}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div
        className="record-change-history record-change-history--empty"
      >
        <Clock aria-hidden="true" size={24} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ol className="record-change-history">
      {history.map((item) => {
        return (
          <li
            key={item.id}
          >
            <span className="record-change-history__icon" aria-hidden="true">
              <User size={16} />
            </span>
            <div className="record-change-history__body">
              <div className="record-change-history__heading">
                <strong>{item.actorName}</strong>
                <time dateTime={item.timestamp}>{formatRecordHistoryTimestamp(item.timestamp)}</time>
              </div>
              <p>{item.summary}</p>
              <div className="record-change-history__meta">
                <span>{item.action}</span>
                {item.source ? <span>{item.source}</span> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
