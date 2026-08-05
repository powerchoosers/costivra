"use client";

import { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export function CardStatus({
  tone = "neutral",
  children,
}: {
  tone?: StatusTone;
  children: ReactNode;
}) {
  return (
    <span className={`card-status-badge card-status-badge--${tone}`}>
      <span className="card-status-dot" />
      {children}
    </span>
  );
}
