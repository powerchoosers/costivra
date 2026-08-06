export function recordDraftChanged(
  initial: Record<string, unknown>,
  current: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  const normalize = (value: unknown) =>
    value == null ? "" : typeof value === "string" ? value.trim() : String(value);
  return fields.some((field) => normalize(initial[field]) !== normalize(current[field]));
}
