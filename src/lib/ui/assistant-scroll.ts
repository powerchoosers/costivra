export const ASSISTANT_SCROLL_BOTTOM_THRESHOLD = 48;

export type AssistantScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

export function getAssistantScrollDistanceFromBottom(metrics: AssistantScrollMetrics): number {
  return Math.max(0, metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop);
}

export function isAssistantNearBottom(
  metrics: AssistantScrollMetrics,
  threshold = ASSISTANT_SCROLL_BOTTOM_THRESHOLD,
): boolean {
  return getAssistantScrollDistanceFromBottom(metrics) <= Math.max(0, threshold);
}

export function getAssistantBottomScrollTop(metrics: Pick<AssistantScrollMetrics, "scrollHeight" | "clientHeight">): number {
  return Math.max(0, metrics.scrollHeight - metrics.clientHeight);
}
