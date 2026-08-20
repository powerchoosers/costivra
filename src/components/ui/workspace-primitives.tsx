"use client";

import { Bell } from "@/lib/icons";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type WorkspaceUtilityButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  shape?: "round" | "soft-square";
};

/**
 * A visual-only control shared by customer and internal workspace chrome.
 * It intentionally owns no navigation, authorization, or state behavior.
 */
export const WorkspaceUtilityButton = forwardRef<
  HTMLButtonElement,
  WorkspaceUtilityButtonProps
>(function WorkspaceUtilityButton(
  {
    active = false,
    className,
    shape = "round",
    type,
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      className={classNames(
        "workspace-utility-button",
        `workspace-utility-button--${shape}`,
        active && "is-active",
        className,
      )}
      ref={ref}
      type={type ?? "button"}
    />
  );
});

export type WorkspaceNotification = {
  body: string;
  createdAt: string;
  href?: string | null;
  id: string;
  readAt: string | null;
  title: string;
};

type WorkspaceNotificationCenterProps = {
  className?: string;
  emptyCopy?: string;
  loading?: boolean;
  notifications: WorkspaceNotification[];
  onMarkAllRead?: () => void | Promise<void>;
  onNotificationSelect?: (notification: WorkspaceNotification) => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function notificationDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * Shared visual notification center for the customer and internal workspaces.
 * It deliberately owns only browser interactions and presentation; each caller
 * supplies its own authorized notification source and read-state actions.
 */
export function WorkspaceNotificationCenter({
  className,
  emptyCopy = "You’re all caught up.",
  loading = false,
  notifications,
  onMarkAllRead,
  onNotificationSelect,
  onOpenChange,
  open,
}: WorkspaceNotificationCenterProps) {
  const centerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);
  const popoverId = useId();
  const unreadCount = notifications.reduce(
    (count, notification) => count + (notification.readAt ? 0 : 1),
    0,
  );

  useEffect(() => {
    if (wasOpen.current && !open) {
      queueMicrotask(() => triggerRef.current?.focus({ preventScroll: true }));
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeWhenLeaving = (event: PointerEvent) => {
      if (centerRef.current?.contains(event.target as Node)) return;
      onOpenChange(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onOpenChange(false);
    };
    document.addEventListener("pointerdown", closeWhenLeaving, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenLeaving, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onOpenChange, open]);

  const unreadLabel = unreadCount
    ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
    : "No unread notifications";

  return (
    <div className={classNames("workspace-notification-center", className)} ref={centerRef}>
      <WorkspaceUtilityButton
        aria-controls={popoverId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifications. ${unreadLabel}`}
        className="workspace-notification-center__trigger"
        onClick={() => onOpenChange(!open)}
        ref={triggerRef}
        title="Notifications"
      >
        <Bell aria-hidden="true" size={17} />
        {unreadCount ? (
          <span aria-hidden="true" className="workspace-notification-center__badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </WorkspaceUtilityButton>

      <section
        aria-hidden={!open}
        aria-label="Notifications"
        aria-modal="false"
        className={classNames(
          "workspace-notification-popover",
          open && "is-open",
        )}
        id={popoverId}
        inert={!open}
        role="dialog"
      >
          <header className="workspace-notification-popover__header">
            <div>
              <strong>Notifications</strong>
              <span>{unreadLabel}</span>
            </div>
            {unreadCount && onMarkAllRead ? (
              <button disabled={!open} onClick={() => void onMarkAllRead()} type="button">
                Mark all read
              </button>
            ) : null}
          </header>
          <div className="workspace-notification-popover__list" data-workspace-scrollbar="">
            {loading && !notifications.length ? (
              <p className="workspace-notification-popover__empty">Loading notifications…</p>
            ) : null}
            {!loading && !notifications.length ? (
              <p className="workspace-notification-popover__empty">{emptyCopy}</p>
            ) : null}
            {notifications.map((notification) => {
              const content = (
                <>
                  <span aria-hidden="true" className="workspace-notification-row__status" />
                  <span className="workspace-notification-row__copy">
                    <strong>{notification.title}</strong>
                    <span>{notification.body}</span>
                  </span>
                  <time dateTime={notification.createdAt}>{notificationDateLabel(notification.createdAt)}</time>
                </>
              );
              return onNotificationSelect ? (
                <button
                  className={classNames(
                    "workspace-notification-row",
                    !notification.readAt && "is-unread",
                  )}
                  key={notification.id}
                  onClick={() => void onNotificationSelect(notification)}
                  disabled={!open}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <article
                  className={classNames(
                    "workspace-notification-row",
                    !notification.readAt && "is-unread",
                  )}
                  key={notification.id}
                >
                  {content}
                </article>
              );
            })}
          </div>
      </section>
    </div>
  );
}

type WorkspaceStatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  withDot?: boolean;
};

/**
 * Common status geometry. Each product keeps its own domain-specific label
 * and tone classes, so visual sharing never changes the meaning of a status.
 */
export function WorkspaceStatusBadge({
  children,
  className,
  withDot = false,
  ...props
}: WorkspaceStatusBadgeProps) {
  return (
    <span {...props} className={classNames("workspace-status-badge", className)}>
      {withDot ? <i aria-hidden="true" className="workspace-status-badge__dot" /> : null}
      {children}
    </span>
  );
}

export type WorkspaceViewTab = {
  count?: number;
  countTone?: "attention";
  disabled?: boolean;
  id: string;
  label: ReactNode;
};

type WorkspaceViewTabsProps = {
  activeId: string;
  ariaLabel: string;
  className?: string;
  onChange: (id: string) => void;
  recordNavigation?: boolean;
  selectionMode?: "current" | "pressed";
  tabs: WorkspaceViewTab[];
};

/**
 * Shared view navigation for work queues and workspace settings. It is a
 * labelled view switcher, rather than a WAI-ARIA tab widget, so routes can
 * retain their own URL state without promising unsupported arrow-key behavior.
 */
export function WorkspaceViewTabs({
  activeId,
  ariaLabel,
  className,
  onChange,
  recordNavigation = false,
  selectionMode = "current",
  tabs,
}: WorkspaceViewTabsProps) {
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const [prevActiveId, setPrevActiveId] = useState(activeId);
  if (prevActiveId !== activeId) {
    setPrevActiveId(activeId);
    setOptimisticId(null);
  }

  const currentActiveId = optimisticId ?? activeId;

  return (
    <nav
      aria-label={ariaLabel}
      className={classNames("workspace-tab-list", "workspace-view-tabs", className)}
      data-record-navigation-tabs={recordNavigation ? "true" : undefined}
    >
      {tabs.map((tab) => {
        const active = tab.id === currentActiveId;
        const isPending = optimisticId !== null && tab.id === optimisticId && tab.id !== activeId;
        return (
          <button
            aria-current={selectionMode === "current" && active ? "true" : undefined}
            aria-pressed={selectionMode === "pressed" ? active : undefined}
            className={classNames("workspace-tab", active && "is-active", isPending && "is-pending")}
            disabled={tab.disabled}
            key={tab.id}
            onClick={() => {
              if (tab.id !== activeId) {
                setOptimisticId(tab.id);
              }
              onChange(tab.id);
            }}
            type="button"
          >
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 ? (
              <span
                className="workspace-tab__count"
                data-tone={tab.countTone}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

type WorkspaceEmptyStateProps = {
  action?: ReactNode;
  className?: string;
  compact?: boolean;
  copy: string;
  icon: ReactNode;
  title: string;
};

/**
 * Shared empty-state hierarchy for a calm, consistent workspace experience.
 */
export function WorkspaceEmptyState({
  action,
  className,
  compact = false,
  copy,
  icon,
  title,
}: WorkspaceEmptyStateProps) {
  return (
    <div
      className={classNames(
        "workspace-empty-state",
        compact && "workspace-empty-state--compact",
        className,
      )}
    >
      <span className="workspace-empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action ? <div className="workspace-empty-state__action">{action}</div> : null}
    </div>
  );
}
