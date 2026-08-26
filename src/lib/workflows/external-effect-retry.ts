export const MAX_AUTOMATIC_EXTERNAL_EFFECT_RETRIES = 3;

export type ExternalEffectRetryDecision = {
  retryable: boolean;
  reason:
    | "not_failed"
    | "provider_outcome_ambiguous"
    | "provider_reference_present"
    | "failure_is_not_retryable"
    | "retry_limit_reached"
    | "safe_retry";
};

/**
 * An external effect may be retried only when we have no evidence that the
 * provider accepted it. A provider reference or ambiguous outcome is a human
 * reconciliation case, never an automatic resend.
 */
export function decideExternalEffectRetry(input: {
  status: string;
  providerReference?: string | null;
  failureClass?: string | null;
  retryCount?: number | null;
}): ExternalEffectRetryDecision {
  if (input.status !== "failed") return { retryable: false, reason: "not_failed" };
  if (input.providerReference) return { retryable: false, reason: "provider_reference_present" };
  if (input.failureClass === "provider_ambiguous") {
    return { retryable: false, reason: "provider_outcome_ambiguous" };
  }
  if (input.failureClass && input.failureClass !== "safe_retry") {
    return { retryable: false, reason: "failure_is_not_retryable" };
  }
  if (Math.max(0, Number(input.retryCount ?? 0)) >= MAX_AUTOMATIC_EXTERNAL_EFFECT_RETRIES) {
    return { retryable: false, reason: "retry_limit_reached" };
  }
  return { retryable: true, reason: "safe_retry" };
}
