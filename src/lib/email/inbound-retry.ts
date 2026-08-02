export const INBOUND_EMAIL_RETRY_DELAYS_SECONDS = [60, 300, 1_800, 7_200] as const;

export function inboundEmailRetryDecision(attemptCount: number, maxAttempts: number) {
  if (attemptCount >= maxAttempts) {
    return { status: "dead_letter" as const, nextAttemptAt: null };
  }
  const delayIndex = Math.min(
    Math.max(attemptCount - 1, 0),
    INBOUND_EMAIL_RETRY_DELAYS_SECONDS.length - 1,
  );
  return {
    status: "retrying" as const,
    nextAttemptAt: new Date(
      Date.now() + INBOUND_EMAIL_RETRY_DELAYS_SECONDS[delayIndex] * 1_000,
    ).toISOString(),
  };
}
