export function isConfiguredSecret(value: string | undefined | null): value is string {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;

  const blocked = ["[SENSITIVE]", "[sensitive]", "[REDACTED]", "[redacted]", "redacted"];
  if (blocked.includes(normalized)) return false;
  if (blocked.includes(normalized.toUpperCase())) return false;
  if (blocked.includes(normalized.toLowerCase())) return false;
  if (normalized.toLowerCase().includes("placeholder")) return false;
  if (normalized === "[ENCRYPTED]") return false;
  if (normalized.toLowerCase().includes("encrypted")) return false;

  return true;
}

export function getConfiguredEnv(name: string): string | undefined {
  const value = process.env[name];
  return isConfiguredSecret(value) ? value.trim() : undefined;
}
