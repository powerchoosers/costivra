export const INTERNAL_NOTIFICATION_LIMIT = 20;
export const INTERNAL_NOTIFICATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

/** Keeps alert actions inside the authenticated internal workspace. */
export function safeManageNotificationHref(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/manage")) return null;
  const trailingCharacter = value.charAt("/manage".length);
  return value === "/manage" || /[/?#]/.test(trailingCharacter) ? value : null;
}

export function recentInternalNotificationCutoff(now = Date.now()) {
  return new Date(now - INTERNAL_NOTIFICATION_MAX_AGE_MS).toISOString();
}
