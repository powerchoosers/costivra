"use client";

import { useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "@/lib/icons";

/** Preserve the existing tool instances and their popovers across breakpoints. */
export function MobileHeaderTools({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  function close() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setOpen(false);
    else setClosing(true);
    trigger.current?.focus();
  }
  return <div className={`workspace-header-tools${open ? " is-open" : ""}${closing ? " is-closing" : ""}`} onKeyDown={(event) => {
    if (event.key === "Escape" && open && !event.defaultPrevented) { event.preventDefault(); close(); }
  }}>
    <button ref={trigger} type="button" className="workspace-header-more" aria-label="More workspace tools" aria-expanded={open && !closing} onClick={() => {
      if (open && !closing) close(); else { setClosing(false); setOpen(true); }
    }}><MoreVertical size={20} aria-hidden="true" /></button>
    <div className="workspace-header-tools-panel" inert={closing} onAnimationEnd={(event) => {
      if (event.target === event.currentTarget && closing) { setClosing(false); setOpen(false); }
    }}>{children}</div>
  </div>;
}
