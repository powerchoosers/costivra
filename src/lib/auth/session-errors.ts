type AuthLikeError = {
  code?: unknown;
  message?: unknown;
};

export function isStaleSessionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as AuthLikeError;
  return (
    code === "refresh_token_not_found" ||
    (typeof message === "string" &&
      message.toLowerCase().includes("invalid refresh token"))
  );
}

export function isSupabaseAuthCookieName(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-token");
}
