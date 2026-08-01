export const MIN_PASSWORD_LENGTH = 12;

export function passwordMeetsMinimumLength(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}
