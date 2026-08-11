import type { ButtonHTMLAttributes, ReactNode } from "react";
import { CostivraAssistantIcon } from "@/components/assistant-icon";

type AssistantIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

/**
 * Shared visual chrome for both Costivra assistants.
 *
 * Data, authorization, and message persistence intentionally remain owned by
 * the portal and internal CRM implementations that use these primitives.
 */
export function AssistantIconButton({
  label,
  className,
  children,
  ...props
}: AssistantIconButtonProps) {
  return (
    <button
      type="button"
      className={["assistant-icon-btn", className].filter(Boolean).join(" ")}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function AssistantWorkspaceHeader({
  title = "Ask Costivra",
  subtitle,
  leading,
  actions,
}: {
  title?: string;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="assistant-header-bar">
      <div className="assistant-header-identity">
        {leading}
        <CostivraAssistantIcon size={24} aria-hidden="true" />
        <div className="assistant-header-copy">
          <strong>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      </div>
      {actions ? <div className="assistant-header-actions">{actions}</div> : null}
    </header>
  );
}

export function AssistantComposerShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["assistant-composer-shell", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
