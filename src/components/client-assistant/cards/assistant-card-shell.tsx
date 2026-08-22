"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@/lib/icons";

export function AssistantCardShell({
  icon,
  label,
  title,
  subtitle,
  status,
  href,
  selected = false,
  onSelect,
  children,
  footer,
}: {
  icon?: ReactNode;
  label?: string;
  title: string;
  subtitle?: string;
  status?: ReactNode;
  href?: string;
  selected?: boolean;
  onSelect?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="assistant-card"
      data-selected={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onSelect();
      }}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="assistant-card-header">
        <div className="assistant-card-title-group">
          {icon && <span className="assistant-card-icon">{icon}</span>}
          <div>
            {label && <span className="assistant-card-label">{label}</span>}
            <h4 className="assistant-card-title">{title}</h4>
            {subtitle && <span className="assistant-card-subtitle">{subtitle}</span>}
          </div>
        </div>
        {status && <div className="assistant-card-status">{status}</div>}
      </div>

      {children && <div className="assistant-card-body">{children}</div>}

      {(footer || href) && (
        <div className="assistant-card-footer">
          {footer}
          {href && (
            <Link href={href} className="assistant-card-link" onClick={(e) => e.stopPropagation()}>
              View record <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
