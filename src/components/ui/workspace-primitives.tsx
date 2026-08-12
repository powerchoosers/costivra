import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
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
export function WorkspaceUtilityButton({
  active = false,
  className,
  shape = "round",
  type,
  ...props
}: WorkspaceUtilityButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        "workspace-utility-button",
        `workspace-utility-button--${shape}`,
        active && "is-active",
        className,
      )}
      type={type ?? "button"}
    />
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
  selectionMode = "current",
  tabs,
}: WorkspaceViewTabsProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={classNames("workspace-tab-list", "workspace-view-tabs", className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            aria-current={selectionMode === "current" && active ? "true" : undefined}
            aria-pressed={selectionMode === "pressed" ? active : undefined}
            className={classNames("workspace-tab", active && "is-active")}
            disabled={tab.disabled}
            key={tab.id}
            onClick={() => onChange(tab.id)}
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
