export const MIN_PASSWORD_LENGTH = 12;

export function passwordMeetsMinimumLength(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export type PasswordUpdateValidation =
  | { ok: true }
  | { ok: false; code: "password_short" | "password_mismatch"; message: string };

export function validatePasswordUpdate(
  password: string,
  confirmation: string,
): PasswordUpdateValidation {
  if (!passwordMeetsMinimumLength(password)) {
    return {
      ok: false,
      code: "password_short",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }
  if (password !== confirmation) {
    return {
      ok: false,
      code: "password_mismatch",
      message: "The two passwords do not match.",
    };
  }
  return { ok: true };
}
