"use client";

import { CostivraMark } from "@/components/brand";
import { PanelLeftClose, PanelLeftOpen } from "@/lib/icons";

export function WorkspaceSidebarBrandToggle({
  collapsed,
  controlsId,
  eyebrow,
  onToggle,
}: {
  collapsed: boolean;
  controlsId: string;
  eyebrow?: string;
  onToggle: () => void;
}) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <button
      aria-controls={controlsId}
      aria-expanded={!collapsed}
      aria-label={label}
      className="workspace-sidebar-brand-toggle"
      data-collapsed={collapsed ? "true" : "false"}
      onClick={onToggle}
      title={label}
      type="button"
    >
      <span className="workspace-sidebar-brand-toggle__symbol" aria-hidden="true">
        <span className="workspace-sidebar-brand-toggle__mark"><CostivraMark size={34} /></span>
        <span className="workspace-sidebar-brand-toggle__icon"><ToggleIcon size={20} /></span>
      </span>
      <span className="workspace-sidebar-brand-toggle__copy" aria-hidden={collapsed}>
        <strong>Costivra</strong>
        {eyebrow ? <small>{eyebrow}</small> : null}
      </span>
    </button>
  );
}
