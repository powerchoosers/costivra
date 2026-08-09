export type SequenceMailboxCandidate = {
  status: "active" | "disabled" | string;
  canSend: boolean;
  mailboxType: "personal" | "shared" | string;
  assignedTo: string | null;
};

/**
 * Sequence enrollment uses the same operator mailbox boundary as the mail UI:
 * active shared mailboxes are available to operators, while personal mailboxes
 * must belong to the enrolling operator.
 */
export function canUseSequenceMailbox(
  userId: string,
  mailbox: SequenceMailboxCandidate,
) {
  return (
    mailbox.status === "active" &&
    mailbox.canSend &&
    (mailbox.mailboxType === "shared" || mailbox.assignedTo === userId)
  );
}
