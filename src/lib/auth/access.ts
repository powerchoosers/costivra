export function validAccessDestination(value: string | null) {
  if (!value) return null;
  if (value === "/manage" || value.startsWith("/manage/")) return value;
  if (value === "/app" || value.startsWith("/app/")) return value;
  return null;
}

export function resolveAccessDestination(input: {
  internal: boolean;
  hasMembership: boolean;
  requested: string | null;
}) {
  const requested = validAccessDestination(input.requested);

  if (requested?.startsWith("/manage") && input.internal) return requested;
  if (requested?.startsWith("/app") && input.hasMembership) return requested;
  if (input.internal) return "/manage";
  if (input.hasMembership) return "/app";
  return "/login?error=no_access";
}
