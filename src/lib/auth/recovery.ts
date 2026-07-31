const MAX_TOKEN_HASH_LENGTH = 2048;

export function isValidRecoveryTokenHash(value: string | null | undefined) {
  return Boolean(value && value.length <= MAX_TOKEN_HASH_LENGTH);
}

export function isExplicitRecoveryConfirmation(searchParams: URLSearchParams) {
  return (
    isValidRecoveryTokenHash(searchParams.get("token_hash")) &&
    searchParams.get("type") === "recovery" &&
    searchParams.get("confirm") === "1"
  );
}
