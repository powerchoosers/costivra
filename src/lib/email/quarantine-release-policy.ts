export function summarizeInboundAttachmentStates(statuses: string[]) {
  const remaining = statuses.some((status) => status === "quarantined" || status === "pending");
  const failed = statuses.some((status) => status === "failed" || status === "unsupported");
  const processedAttachmentCount = statuses.filter((status) =>
    status === "processed" || status === "duplicate",
  ).length;
  return {
    status: remaining ? "quarantined" as const : failed ? "needs_review" as const : "processed" as const,
    processedAttachmentCount,
    complete: !remaining,
  };
}
