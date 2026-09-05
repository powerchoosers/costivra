"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search, X } from "@/lib/icons";

export type SettingsHubItem<T extends string> = {
  id: T;
  group: string;
  title: string;
  description: string;
  keywords?: string[];
};

type SettingsHubProps<T extends string> = {
  ariaLabel: string;
  items: SettingsHubItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  children: ReactNode;
  compactMobile?: boolean;
};

/**
 * Shared, client-only directory for settings surfaces. It deliberately indexes
 * only the settings the current viewer is allowed to see; it never fetches or
 * exposes configuration data itself.
 */
export function SettingsHub<T extends string>({ ariaLabel, items, value, onValueChange, children, compactMobile = false }: SettingsHubProps<T>) {
  const [query, setQuery] = useState("");
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [directoryClosing, setDirectoryClosing] = useState(false);
  const closeDirectory = () => {
    if (compactMobile && window.matchMedia("(max-width: 780px)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setDirectoryClosing(true);
    else setDirectoryOpen(false);
    categoryRef.current?.focus();
  };
  const categoryRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (compactMobile && window.matchMedia("(max-width: 780px)").matches) {
          setDirectoryOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        } else inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [compactMobile]);

  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(() => items.filter((item) =>
    !normalizedQuery || [item.title, item.description, ...(item.keywords ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  ), [items, normalizedQuery]);
  const groups = useMemo(() => [...new Set(matches.map((item) => item.group))], [matches]);

  return <div className={`workspace-settings-hub${compactMobile ? " workspace-settings-hub--compact-mobile" : ""}${directoryOpen ? " is-directory-open" : ""}${directoryClosing ? " is-directory-closing" : ""}`} onKeyDown={(event) => { if (event.key === "Escape" && directoryOpen) closeDirectory(); }}>
    {compactMobile && <button ref={categoryRef} type="button" className="workspace-settings-category" aria-expanded={directoryOpen && !directoryClosing} onClick={() => { if (directoryOpen) closeDirectory(); else { setDirectoryClosing(false); setDirectoryOpen(true); } }}>
      <span><small>Settings category</small><strong>{items.find((item) => item.id === value)?.title}</strong></span>
      <ChevronDown size={18} aria-hidden="true" />
    </button>}
    <aside className="workspace-settings-directory" aria-label={ariaLabel} inert={directoryClosing} onAnimationEnd={(event) => { if (event.target === event.currentTarget && directoryClosing) { setDirectoryClosing(false); setDirectoryOpen(false); } }}>
      <div className="workspace-settings-search">
        <Search size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="searchbox"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search settings"
          aria-label="Search settings"
        />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear settings search"><X size={14} /></button>}
      </div>
      <p className="workspace-settings-search-hint"><kbd>⌘</kbd><kbd>Ctrl</kbd><span>K</span> to search</p>
      <nav className="workspace-settings-nav" aria-label="Settings directory">
        {groups.map((group) => <section key={group}>
          <h2>{group}</h2>
          {matches.filter((item) => item.group === group).map((item) => <button
            key={item.id}
            type="button"
            className={item.id === value ? "is-active" : undefined}
            aria-current={item.id === value ? "page" : undefined}
            onClick={() => {
              onValueChange(item.id);
              closeDirectory();
              setQuery("");
              if (compactMobile && window.matchMedia("(max-width: 780px)").matches) categoryRef.current?.focus();
            }}
          >
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </button>)}
        </section>)}
        {!matches.length && <p className="workspace-settings-empty" role="status">No settings match “{query}”. Try a broader term.</p>}
      </nav>
    </aside>
    <div className="workspace-settings-content">{children}</div>
  </div>;
}
