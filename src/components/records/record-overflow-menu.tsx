"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { MoreVertical } from "@/lib/icons";

export type RecordMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  hidden?: boolean;
  destructive?: boolean;
  separatorBefore?: boolean;
  onSelect?: () => void;
  href?: string;
};

export type RecordOverflowMenuProps = {
  items: RecordMenuItem[];
  ariaLabel?: string;
};

function enabledIndexes(items: RecordMenuItem[]) {
  return items.flatMap((item, index) => (item.disabled ? [] : [index]));
}

function nextEnabledIndex(
  items: RecordMenuItem[],
  current: number,
  direction: 1 | -1,
) {
  const enabled = enabledIndexes(items);
  if (!enabled.length) return -1;
  const currentPosition = enabled.indexOf(current);
  if (currentPosition === -1) {
    return direction === 1 ? enabled[0] : enabled[enabled.length - 1];
  }
  return enabled[(currentPosition + direction + enabled.length) % enabled.length];
}

function edgeEnabledIndex(items: RecordMenuItem[], edge: "first" | "last") {
  const enabled = enabledIndexes(items);
  if (!enabled.length) return -1;
  return edge === "first" ? enabled[0] : enabled[enabled.length - 1];
}

export function shouldOpenMenuUpward(top: number, bottom: number, viewportHeight: number) {
  return viewportHeight - bottom < 300 && top > viewportHeight - bottom;
}

export function RecordOverflowMenu({
  items,
  ariaLabel = "More record actions",
}: RecordOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [opensUpward, setOpensUpward] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const menuId = useId();

  const visibleItems = useMemo(
    () => items.filter((item) => !item.hidden),
    [items],
  );

  const focusItem = (index: number) => {
    setActiveIndex(index);
    window.requestAnimationFrame(() => itemRefs.current[index]?.focus());
  };

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const openMenu = (focus: "none" | "first" | "last" = "none") => {
    const nextIndex = edgeEnabledIndex(
      visibleItems,
      focus === "last" ? "last" : "first",
    );
    const rect = triggerRef.current?.getBoundingClientRect();
    setOpensUpward(Boolean(rect && shouldOpenMenuUpward(rect.top, rect.bottom, window.innerHeight)));
    setOpen(true);
    setActiveIndex(nextIndex);
    if (focus !== "none" && nextIndex >= 0) {
      window.requestAnimationFrame(() => itemRefs.current[nextIndex]?.focus());
    }
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        closeMenu(false);
      }
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [open]);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu("last");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) closeMenu(true);
      else openMenu("first");
    }
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = nextEnabledIndex(
        visibleItems,
        activeIndex,
        event.key === "ArrowDown" ? 1 : -1,
      );
      if (next >= 0) focusItem(next);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const next = edgeEnabledIndex(
        visibleItems,
        event.key === "Home" ? "first" : "last",
      );
      if (next >= 0) focusItem(next);
    } else if (event.key === "Tab") {
      closeMenu(false);
    }
  };

  const handleSelect = (item: RecordMenuItem) => {
    if (item.disabled) return;
    closeMenu(true);
    item.onSelect?.();
  };

  const itemStyle = (item: RecordMenuItem, index: number) => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 14px",
    border: "none",
    background:
      index === activeIndex
        ? item.destructive
          ? "rgba(196, 75, 75, 0.08)"
          : "rgba(0, 47, 167, 0.06)"
        : "transparent",
    color: item.disabled
      ? "var(--assistant-muted, #94a3b8)"
      : item.destructive
        ? "var(--assistant-danger, #c44b4b)"
        : "var(--assistant-text, #0f172a)",
    fontSize: "0.85rem",
    fontWeight: 500,
    textAlign: "left" as const,
    textDecoration: "none",
    cursor: item.disabled ? "not-allowed" : "pointer",
    transition: "background 100ms ease",
  });

  const itemContent = (item: RecordMenuItem) => (
    <>
      {item.icon ? (
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: item.disabled ? 0.5 : 0.85,
          }}
        >
          {item.icon}
        </span>
      ) : null}
      <span
        style={{
          flex: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {item.label}
      </span>
    </>
  );

  return (
    <div
      className="record-overflow-menu-wrap"
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="record-overflow-trigger"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        onClick={() => {
          if (open) closeMenu(false);
          else openMenu("none");
        }}
        onKeyDown={handleTriggerKeyDown}
        style={{
          width: 42,
          height: 42,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 10,
          border: "1px solid transparent",
          background: "transparent",
          boxShadow: "none",
          color: "var(--assistant-text-secondary, #475569)",
          cursor: "pointer",
          transition: "background 140ms ease, border-color 140ms ease",
        }}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          className="record-overflow-dropdown"
          onKeyDown={handleMenuKeyDown}
          style={{
            position: "absolute",
            ...(opensUpward ? { bottom: "100%", marginBottom: 6 } : { top: "100%", marginTop: 6 }),
            right: 0,
            minWidth: 220,
            maxWidth: 280,
            maxHeight: "min(420px, calc(100vh - 32px))",
            overflowY: "auto",
            padding: "6px 0",
            background: "#ffffff",
            border: "1px solid rgba(30, 41, 59, 0.14)",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
            zIndex: 1100,
            animation: "recordMenuFadeIn 160ms ease-out both",
          }}
        >
          {visibleItems.map((item, index) => {
            const commonProps = {
              role: "menuitem" as const,
              tabIndex: index === activeIndex && !item.disabled ? 0 : -1,
              onMouseEnter: () => setActiveIndex(index),
              onFocus: () => setActiveIndex(index),
              style: itemStyle(item, index),
            };

            return (
              <div key={item.id}>
                {item.separatorBefore ? (
                  <div
                    role="separator"
                    style={{
                      height: 1,
                      background: "rgba(30, 41, 59, 0.08)",
                      margin: "4px 0",
                    }}
                  />
                ) : null}
                {item.href && !item.disabled ? (
                  <Link
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    href={item.href}
                    {...commonProps}
                    onClick={() => handleSelect(item)}
                  >
                    {itemContent(item)}
                  </Link>
                ) : (
                  <button
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    type="button"
                    disabled={item.disabled}
                    aria-disabled={item.disabled || undefined}
                    {...commonProps}
                    onClick={() => handleSelect(item)}
                  >
                    {itemContent(item)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
