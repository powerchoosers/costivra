"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CostivraMark } from "@/components/brand";
import { Palette } from "@/lib/icons";
import {
  WORKSPACE_THEME_PREFERENCE_COOKIE,
  WORKSPACE_THEME_PREFERENCE_KEY,
  parseWorkspaceThemePreference,
  resolveEffectiveWorkspaceTheme,
  workspaceThemePreferenceCookie,
  type EffectiveWorkspaceTheme,
  type WorkspaceThemePreference,
} from "@/lib/ui/workspace-preferences";

type WorkspaceThemeContextValue = {
  preference: WorkspaceThemePreference;
  effectiveTheme: EffectiveWorkspaceTheme;
  setPreference: (preference: WorkspaceThemePreference) => void;
};

const WorkspaceThemeContext = createContext<WorkspaceThemeContextValue | null>(null);
const themePreferenceEvent = "costivra:workspace-theme-change";

function readThemePreference() {
  const stored = parseWorkspaceThemePreference(window.localStorage.getItem(WORKSPACE_THEME_PREFERENCE_KEY));
  if (stored) return stored;
  const cookieValue = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${WORKSPACE_THEME_PREFERENCE_COOKIE}=`))
    ?.split("=")[1];
  return parseWorkspaceThemePreference(cookieValue) ?? "system";
}

function applyTheme(preference: WorkspaceThemePreference) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const effectiveTheme = resolveEffectiveWorkspaceTheme(preference, media.matches);
  document.documentElement.dataset.workspaceTheme = effectiveTheme;
  document.documentElement.dataset.workspaceThemePreference = preference;
  document.documentElement.style.colorScheme = effectiveTheme;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = effectiveTheme === "dark" ? "#0c1118" : "#f5f7fa";
  });
  return effectiveTheme;
}

export function WorkspaceThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<WorkspaceThemePreference>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveWorkspaceTheme>("light");

  const setPreference = useCallback((nextPreference: WorkspaceThemePreference) => {
    window.localStorage.setItem(WORKSPACE_THEME_PREFERENCE_KEY, nextPreference);
    document.cookie = workspaceThemePreferenceCookie(nextPreference);
    setPreferenceState(nextPreference);
    setEffectiveTheme(applyTheme(nextPreference));
    window.dispatchEvent(new CustomEvent(themePreferenceEvent, { detail: nextPreference }));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncPreference = () => {
      const nextPreference = readThemePreference();
      setPreferenceState(nextPreference);
      setEffectiveTheme(applyTheme(nextPreference));
    };
    const syncFromEvent = (event: Event) => {
      const nextPreference = parseWorkspaceThemePreference((event as CustomEvent<string>).detail);
      if (!nextPreference) return;
      setPreferenceState(nextPreference);
      setEffectiveTheme(applyTheme(nextPreference));
    };
    syncPreference();
    media.addEventListener("change", syncPreference);
    window.addEventListener("storage", syncPreference);
    window.addEventListener(themePreferenceEvent, syncFromEvent);
    return () => {
      media.removeEventListener("change", syncPreference);
      window.removeEventListener("storage", syncPreference);
      window.removeEventListener(themePreferenceEvent, syncFromEvent);
    };
  }, []);

  const value = useMemo(() => ({ preference, effectiveTheme, setPreference }), [effectiveTheme, preference, setPreference]);
  return <WorkspaceThemeContext.Provider value={value}>{children}</WorkspaceThemeContext.Provider>;
}

export function useWorkspaceTheme() {
  const value = useContext(WorkspaceThemeContext);
  if (!value) throw new Error("useWorkspaceTheme must be used inside WorkspaceThemeProvider");
  return value;
}

const themeChoices: Array<{ id: WorkspaceThemePreference; title: string; description: string }> = [
  { id: "system", title: "System", description: "Follow this device’s appearance." },
  { id: "light", title: "Light", description: "Use the bright workspace." },
  { id: "dark", title: "Dark", description: "Use the low-light workspace." },
];

export function WorkspaceAppearanceSettings({ workspaceLabel }: { workspaceLabel: "App" | "Manage" }) {
  const { preference, effectiveTheme, setPreference } = useWorkspaceTheme();
  return (
    <section className="portal-panel workspace-appearance-panel" aria-labelledby="workspace-appearance-title">
      <header className="workspace-appearance-header">
        <div>
          <span>Branding &amp; appearance</span>
          <h2 id="workspace-appearance-title">Workspace theme</h2>
          <p>Choose how Costivra looks on this device. Your choice applies to both the customer App and internal Manage workspace.</p>
        </div>
        <span className="workspace-appearance-icon" aria-hidden="true"><Palette size={20} /></span>
      </header>
      <div className="workspace-theme-preview" aria-hidden="true">
        <div className="workspace-theme-preview__rail"><CostivraMark /></div>
        <div className="workspace-theme-preview__canvas">
          <i /><span /><span /><strong />
        </div>
      </div>
      <fieldset className="workspace-theme-options">
        <legend>Appearance</legend>
        {themeChoices.map((choice) => (
          <label key={choice.id} className={preference === choice.id ? "is-selected" : undefined}>
            <input
              type="radio"
              name={`${workspaceLabel.toLowerCase()}-workspace-theme`}
              value={choice.id}
              checked={preference === choice.id}
              onChange={() => setPreference(choice.id)}
            />
            <span className={`workspace-theme-swatch workspace-theme-swatch--${choice.id}`} aria-hidden="true"><i /><b /></span>
            <span><strong>{choice.title}</strong><small>{choice.description}</small></span>
          </label>
        ))}
      </fieldset>
      <p className="workspace-theme-status" role="status">
        {workspaceLabel} is using the <strong>{effectiveTheme}</strong> theme{preference === "system" ? " from your system preference" : ""}.
      </p>
    </section>
  );
}
