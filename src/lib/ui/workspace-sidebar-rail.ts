"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

const SIDEBAR_HOVER_PREVIEW_DELAY_MS = 2_000;

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(
    target.closest(
      "a, button, input, textarea, select, [role='button'], [role='link'], [contenteditable='true']",
    ),
  );
}

/**
 * Keeps a desktop rail's saved state separate from a short-lived hover preview.
 * Blank rail space is an intentional pointer shortcut; interactive descendants
 * retain their own click and keyboard behavior.
 */
export function useWorkspaceSidebarRail({
  enabled,
  isCollapsed,
  onToggle,
  onPreviewOpen,
}: {
  enabled: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onPreviewOpen?: () => void;
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewTimerRef = useRef<number | null>(null);

  const clearPreviewTimer = useCallback(() => {
    if (previewTimerRef.current === null) return;
    window.clearTimeout(previewTimerRef.current);
    previewTimerRef.current = null;
  }, []);

  const closePreview = useCallback(() => {
    clearPreviewTimer();
    setIsPreviewOpen(false);
  }, [clearPreviewTimer]);

  useEffect(() => () => {
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
    }
  }, []);

  const onPointerEnter = useCallback(() => {
    if (!enabled || !isCollapsed || previewTimerRef.current !== null) return;
    previewTimerRef.current = window.setTimeout(() => {
      previewTimerRef.current = null;
      onPreviewOpen?.();
      setIsPreviewOpen(true);
    }, SIDEBAR_HOVER_PREVIEW_DELAY_MS);
  }, [enabled, isCollapsed, onPreviewOpen]);

  const onPointerLeave = useCallback(() => {
    closePreview();
  }, [closePreview]);

  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    if (isInteractiveTarget(event.target)) {
      // A navigation or menu click should not leave a hover preview behind.
      closePreview();
      return;
    }

    closePreview();
    onToggle();
  }, [closePreview, enabled, onToggle]);

  return {
    isPreviewOpen: enabled && isCollapsed && isPreviewOpen,
    closePreview,
    onClickCapture,
    onPointerEnter: onPointerEnter as (event: PointerEvent<HTMLElement>) => void,
    onPointerLeave: onPointerLeave as (event: PointerEvent<HTMLElement>) => void,
  };
}
