"use client";

import { useState, useRef, useEffect, KeyboardEvent, ReactNode } from "react";
import { MoreVertical } from "lucide-react";

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

export function RecordOverflowMenu({
  items,
  ariaLabel = "More record actions",
}: RecordOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleItems = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);



  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => {
        let next = (prev + 1) % visibleItems.length;
        while (visibleItems[next]?.disabled && next !== prev) {
          next = (next + 1) % visibleItems.length;
        }
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => {
        let next = (prev - 1 + visibleItems.length) % visibleItems.length;
        while (visibleItems[next]?.disabled && next !== prev) {
          next = (next - 1 + visibleItems.length) % visibleItems.length;
        }
        return next;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(visibleItems.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const currentItem = visibleItems[activeIndex];
      if (currentItem && !currentItem.disabled) {
        setOpen(false);
        triggerRef.current?.focus();
        currentItem.onSelect?.();
      }
    }
  };

  const handleSelect = (item: RecordMenuItem) => {
    if (item.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    item.onSelect?.();
  };

  return (
    <div className="record-overflow-menu-wrap" style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={triggerRef}
        type="button"
        className="record-overflow-trigger"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
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
          transition: "all 140ms ease",
        }}
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          className="record-overflow-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            minWidth: 220,
            maxWidth: 280,
            padding: "6px 0",
            background: "#ffffff",
            border: "1px solid rgba(30, 41, 59, 0.14)",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
            zIndex: 1100,
            animation: "recordMenuFadeIn 160ms ease-out both",
          }}
        >
          {visibleItems.map((item, idx) => (
            <div key={item.id}>
              {item.separatorBefore && (
                <div
                  style={{
                    height: 1,
                    background: "rgba(30, 41, 59, 0.08)",
                    margin: "4px 0",
                  }}
                />
              )}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                tabIndex={idx === activeIndex ? 0 : -1}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  border: "none",
                  background:
                    idx === activeIndex
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
                  textAlign: "left",
                  cursor: item.disabled ? "not-allowed" : "pointer",
                  transition: "background 100ms ease",
                }}
              >
                {item.icon && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: item.disabled ? 0.5 : 0.85,
                    }}
                  >
                    {item.icon}
                  </span>
                )}
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.label}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
