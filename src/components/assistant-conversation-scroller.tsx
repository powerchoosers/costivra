"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "@/lib/icons";
import { getMotionSafeScrollBehavior } from "@/lib/ui/motion";
import {
  getAssistantBottomScrollTop,
  isAssistantNearBottom,
} from "@/lib/ui/assistant-scroll";

export function AssistantConversationScroller({
  children,
  className,
  itemCount,
  isLoading = false,
  conversationKey,
  ariaLive = true,
}: {
  children: ReactNode;
  className?: string;
  itemCount: number;
  isLoading?: boolean;
  conversationKey?: string | null;
  ariaLive?: boolean;
}) {
  const scrollportRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const previousCountRef = useRef(itemCount);
  const previousConversationKeyRef = useRef(conversationKey);
  const followLatestRef = useRef(true);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const updateScrollState = useCallback(() => {
    const scrollport = scrollportRef.current;
    if (!scrollport) return;

    const nearBottom = isAssistantNearBottom({
      scrollTop: scrollport.scrollTop,
      scrollHeight: scrollport.scrollHeight,
      clientHeight: scrollport.clientHeight,
    });
    followLatestRef.current = nearBottom;
    setShowJumpButton(!nearBottom && scrollport.scrollHeight > scrollport.clientHeight);
    if (nearBottom) setHasNewMessages(false);
  }, []);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = getMotionSafeScrollBehavior()) => {
    const scrollport = scrollportRef.current;
    if (!scrollport) return;

    scrollport.scrollTo({
      top: getAssistantBottomScrollTop(scrollport),
      behavior,
    });
    followLatestRef.current = true;
    setShowJumpButton(false);
    setHasNewMessages(false);
  }, []);

  useEffect(() => {
    const scrollport = scrollportRef.current;
    if (!scrollport) return;

    const conversationChanged = previousConversationKeyRef.current !== conversationKey;
    const messageCountChanged = previousCountRef.current !== itemCount;
    const nearBottom = isAssistantNearBottom({
      scrollTop: scrollport.scrollTop,
      scrollHeight: scrollport.scrollHeight,
      clientHeight: scrollport.clientHeight,
    });

    if (
      !initializedRef.current
      || conversationChanged
      || (messageCountChanged && (followLatestRef.current || nearBottom))
    ) {
      window.requestAnimationFrame(() => scrollToLatest("auto"));
    } else if (messageCountChanged) {
      setHasNewMessages(true);
      setShowJumpButton(true);
    }

    initializedRef.current = true;
    previousConversationKeyRef.current = conversationKey;
    previousCountRef.current = itemCount;
    window.requestAnimationFrame(updateScrollState);
  }, [conversationKey, isLoading, itemCount, scrollToLatest, updateScrollState]);

  useEffect(() => {
    const scrollport = scrollportRef.current;
    if (!scrollport || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scrollport);
    return () => observer.disconnect();
  }, [updateScrollState]);

  return (
    <div className="assistant-conversation-scroller">
      <div
        ref={scrollportRef}
        className={className}
        aria-live={ariaLive ? "polite" : undefined}
        onScroll={updateScrollState}
      >
        {children}
      </div>
      <button
        type="button"
        className={`assistant-jump-latest${showJumpButton ? " is-visible" : ""}${hasNewMessages ? " has-new-messages" : ""}`}
        aria-label={hasNewMessages ? "Jump to latest messages; new messages below" : "Jump to latest messages"}
        aria-hidden={!showJumpButton}
        tabIndex={showJumpButton ? 0 : -1}
        onClick={() => scrollToLatest()}
      >
        <ArrowDown size={17} aria-hidden="true" />
      </button>
    </div>
  );
}
