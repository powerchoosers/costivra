export const APP_SIDEBAR_PREFERENCE_KEY = "costivra.app.sidebar-collapsed";
export const APP_SIDEBAR_PREFERENCE_COOKIE = "costivra_app_sidebar_collapsed";

const SIDEBAR_PREFERENCE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parseAppSidebarPreference(value: string | undefined) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function appSidebarPreferenceCookie(collapsed: boolean) {
  return `${APP_SIDEBAR_PREFERENCE_COOKIE}=${collapsed}; Path=/; Max-Age=${SIDEBAR_PREFERENCE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
