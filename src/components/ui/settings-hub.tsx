"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, X } from "@/lib/icons";

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
};

/**
 * Shared, client-only directory for settings surfaces. It deliberately indexes
 * only the settings the current viewer is allowed to see; it never fetches or
 * exposes configuration data itself.
 */
export function SettingsHub<T extends string>({ ariaLabel, items, value, onValueChange, children }: SettingsHubProps<T>) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(() => items.filter((item) =>
    !normalizedQuery || [item.title, item.description, ...(item.keywords ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  ), [items, normalizedQuery]);
  const groups = useMemo(() => [...new Set(matches.map((item) => item.group))], [matches]);

  return <div className="workspace-settings-hub">
    <aside className="workspace-settings-directory" aria-label={ariaLabel}>
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
            onClick={() => onValueChange(item.id)}
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
