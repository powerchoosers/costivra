"use client";

import type { CSSProperties, ReactNode } from "react";

export function SkeletonBlock({
  className = "",
  style,
  height,
  width,
  borderRadius = "6px",
}: {
  className?: string;
  style?: CSSProperties;
  height?: string | number;
  width?: string | number;
  borderRadius?: string;
}) {
  return (
    <div
      className={`costivra-skeleton-shimmer ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
        borderRadius,
        backgroundColor: "var(--paper-deep, #eae6dc)",
        opacity: 0.85,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 1,
  width = "100%",
  className = "",
}: {
  lines?: number;
  width?: string | number;
  className?: string;
}) {
  if (lines === 1) {
    return <SkeletonBlock width={width} height="0.875rem" className={className} />;
  }
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={i === lines - 1 ? "60%" : width}
          height="0.875rem"
        />
      ))}
    </div>
  );
}

export function SkeletonBadge({ width = "4.5rem", className = "" }: { width?: string | number; className?: string }) {
  return <SkeletonBlock width={width} height="1.35rem" borderRadius="9999px" className={className} />;
}

export function SkeletonField({
  label,
  className = "",
}: {
  label?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label ? (
        <div className="text-xs text-[var(--muted,#6f746f)] font-medium">{label}</div>
      ) : (
        <SkeletonBlock width="35%" height="0.75rem" />
      )}
      <SkeletonBlock width="80%" height="1.25rem" />
    </div>
  );
}

export function SkeletonRow({
  columns = 4,
  className = "",
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 py-3 px-4 border-b border-[var(--line,#cec9bd)]/40 ${className}`}>
      <SkeletonBlock width="1.25rem" height="1.25rem" borderRadius="4px" />
      <div className="flex-1 space-y-1.5">
        <SkeletonBlock width="50%" height="0.95rem" />
        <SkeletonBlock width="30%" height="0.75rem" />
      </div>
      {Array.from({ length: columns - 1 }).map((_, c) => (
        <SkeletonBlock key={c} width={`${15 + (c % 2) * 10}%`} height="0.875rem" />
      ))}
    </div>
  );
}
