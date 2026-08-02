export function inboundEmailOutcomeMessage(input: {
  hasQuarantine: boolean;
  attachmentCount: number;
  needsReview: boolean;
}) {
  if (input.hasQuarantine) {
    return "One or more attachments are waiting for malware scanning.";
  }
  if (input.attachmentCount === 0) {
    return "No supported attachments were included in this email.";
  }
  if (input.needsReview) {
    return "One or more attachments need review.";
  }
  return null;
}
