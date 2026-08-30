export const APP_SIDEBAR_PREFERENCE_KEY = "costivra.app.sidebar-collapsed";
export const APP_SIDEBAR_PREFERENCE_COOKIE = "costivra_app_sidebar_collapsed";
export const MANAGE_SIDEBAR_PREFERENCE_KEY = "costivra.manage.sidebar-collapsed";
export const MANAGE_SIDEBAR_PREFERENCE_COOKIE = "costivra_manage_sidebar_collapsed";
export const WORKSPACE_THEME_PREFERENCE_KEY = "costivra.workspace.theme";
export const WORKSPACE_THEME_PREFERENCE_COOKIE = "costivra_workspace_theme";

const SIDEBAR_PREFERENCE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ManageSidebarViewport = "desktop" | "compact" | "mobile";
export type WorkspaceThemePreference = "system" | "light" | "dark";
export type EffectiveWorkspaceTheme = "light" | "dark";

export function parseSidebarPreference(value: string | undefined) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export const parseAppSidebarPreference = parseSidebarPreference;

export function appSidebarPreferenceCookie(collapsed: boolean) {
  return `${APP_SIDEBAR_PREFERENCE_COOKIE}=${collapsed}; Path=/; Max-Age=${SIDEBAR_PREFERENCE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function manageSidebarPreferenceCookie(collapsed: boolean) {
  return `${MANAGE_SIDEBAR_PREFERENCE_COOKIE}=${collapsed}; Path=/; Max-Age=${SIDEBAR_PREFERENCE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function parseWorkspaceThemePreference(value: string | undefined | null): WorkspaceThemePreference | null {
  if (value === "system" || value === "light" || value === "dark") return value;
  return null;
}

export function resolveEffectiveWorkspaceTheme(
  preference: WorkspaceThemePreference,
  prefersDark: boolean,
): EffectiveWorkspaceTheme {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

export function workspaceThemePreferenceCookie(preference: WorkspaceThemePreference) {
  return `${WORKSPACE_THEME_PREFERENCE_COOKIE}=${preference}; Path=/; Max-Age=${SIDEBAR_PREFERENCE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function resolveManageRailOpen(viewport: ManageSidebarViewport, sidebarCollapsedPreference: boolean | null) {
  if (viewport === "mobile") return false;
  if (viewport === "compact" && sidebarCollapsedPreference === null) return false;
  return sidebarCollapsedPreference !== true;
}

export function shouldPersistManageRailPreference(
  viewport: ManageSidebarViewport,
  sidebarCollapsedPreference: boolean | null,
  hasSessionOverride: boolean,
) {
  return viewport !== "mobile" && (sidebarCollapsedPreference !== null || hasSessionOverride);
}
