"use client";

import type { CSSProperties } from "react";

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
      className={`costivra-skeleton-pulse ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
        borderRadius,
        backgroundColor: "rgba(255, 255, 255, 0.07)",
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function WorkspaceCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <SkeletonBlock width="45%" height="0.875rem" />
            <SkeletonBlock width="1.25rem" height="1.25rem" borderRadius="50%" />
          </div>
          <SkeletonBlock width="70%" height="1.75rem" />
          <SkeletonBlock width="35%" height="0.75rem" />
        </div>
      ))}
    </div>
  );
}

export function WorkspaceTableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3.5 border-b border-white/10 bg-zinc-900/80">
        <SkeletonBlock width="1.25rem" height="1.25rem" borderRadius="4px" />
        {Array.from({ length: columns }).map((_, cIdx) => (
          <SkeletonBlock
            key={cIdx}
            width={cIdx === 0 ? "30%" : `${Math.floor(60 / (columns - 1))}%`}
            height="0.75rem"
          />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center gap-4 px-5 py-4">
            <SkeletonBlock width="1.25rem" height="1.25rem" borderRadius="4px" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock width={`${65 + (rIdx % 3) * 10}%`} height="0.9rem" />
              <SkeletonBlock width={`${35 + (rIdx % 2) * 15}%`} height="0.75rem" />
            </div>
            {Array.from({ length: columns - 1 }).map((_, cIdx) => (
              <SkeletonBlock
                key={cIdx}
                width={`${12 + ((rIdx + cIdx) % 3) * 5}%`}
                height="0.875rem"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkspaceToolbarSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-2">
        <SkeletonBlock width="8rem" height="2.25rem" borderRadius="8px" />
        <SkeletonBlock width="6rem" height="2.25rem" borderRadius="8px" />
        <SkeletonBlock width="6rem" height="2.25rem" borderRadius="8px" />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBlock width="14rem" height="2.25rem" borderRadius="8px" />
        <SkeletonBlock width="6rem" height="2.25rem" borderRadius="8px" />
      </div>
    </div>
  );
}

export function WorkspaceDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SkeletonBlock width="3rem" height="3rem" borderRadius="10px" />
            <div className="space-y-2">
              <SkeletonBlock width="14rem" height="1.5rem" />
              <SkeletonBlock width="8rem" height="0.875rem" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock width="6rem" height="2.25rem" borderRadius="8px" />
            <SkeletonBlock width="6rem" height="2.25rem" borderRadius="8px" />
          </div>
        </div>
      </div>
      {/* Tabs */}
      <WorkspaceToolbarSkeleton />
      {/* Content */}
      <WorkspaceTableSkeleton rows={5} />
    </div>
  );
}

export function PortalPageSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse max-w-[1600px] mx-auto">
      {/* Page Heading */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="space-y-2">
          <SkeletonBlock width="12rem" height="1.75rem" />
          <SkeletonBlock width="20rem" height="0.875rem" />
        </div>
        <SkeletonBlock width="8rem" height="2.5rem" borderRadius="8px" />
      </div>
      {/* Metric Cards */}
      <WorkspaceCardSkeleton count={4} />
      {/* Toolbar & Tabs */}
      <WorkspaceToolbarSkeleton />
      {/* Table */}
      <WorkspaceTableSkeleton rows={8} />
    </div>
  );
}

export function ManagePageSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse max-w-[1600px] mx-auto">
      {/* Page Heading */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="space-y-2">
          <SkeletonBlock width="14rem" height="1.75rem" />
          <SkeletonBlock width="24rem" height="0.875rem" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock width="7rem" height="2.25rem" borderRadius="8px" />
          <SkeletonBlock width="7rem" height="2.25rem" borderRadius="8px" />
        </div>
      </div>
      {/* Metric Cards */}
      <WorkspaceCardSkeleton count={4} />
      {/* Toolbar */}
      <WorkspaceToolbarSkeleton />
      {/* Table */}
      <WorkspaceTableSkeleton rows={8} />
    </div>
  );
}
