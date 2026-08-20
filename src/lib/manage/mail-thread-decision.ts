import type { ManageMailMessage, ManageMailThread } from "@/lib/manage/types";

export type MailThreadDecision = {
  description: string;
  facts: Array<{ label: string; value: string }>;
  heading: string;
  recommendsReply: boolean;
};

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * Gives a mail detail the next safe, accountable action without treating a
 * delivery status or an unscanned attachment as permission to act.
 */
export function getMailThreadDecision(
  thread: ManageMailThread,
  messages: readonly ManageMailMessage[],
): MailThreadDecision {
  const latestMessage = messages.at(-1) ?? null;
  const latestDirection = latestMessage?.direction ?? thread.latestDirection;
  const attachments = messages.flatMap((message) => message.attachments);
  const blockedAttachmentCount = attachments.filter((attachment) =>
    attachment.status === "infected" || attachment.status === "unavailable" || attachment.status === "failed",
  ).length;
  const pendingAttachmentCount = attachments.filter((attachment) =>
    attachment.status === "pending" || attachment.status === "scanning",
  ).length;
  const allAttachmentsClean = attachments.length > 0 && attachments.every((attachment) => attachment.status === "clean");
  const sourceFiles = !attachments.length
    ? "None"
    : blockedAttachmentCount
      ? `${pluralize(blockedAttachmentCount, "file")} unavailable`
      : pendingAttachmentCount
        ? `${pluralize(pendingAttachmentCount, "file")} checking`
        : allAttachmentsClean
          ? `${pluralize(attachments.length, "file")} checked`
          : pluralize(attachments.length, "attachment");
  const facts = [
    { label: "Account", value: thread.organizationId && thread.organizationName ? `Linked to ${thread.organizationName}` : "Not linked" },
    { label: "Latest message", value: latestDirection === "inbound" ? "Received" : latestDirection === "outbound" ? "Sent" : "Not recorded" },
    { label: "Source files", value: sourceFiles },
  ];

  if (blockedAttachmentCount) {
    return {
      heading: "Attachment access needs attention",
      description: `${pluralize(blockedAttachmentCount, "attached file")} cannot be opened. Keep the original conversation context and resolve the file state before relying on it as evidence.`,
      facts,
      recommendsReply: false,
    };
  }

  if (pendingAttachmentCount) {
    return {
      heading: "Source files are still being checked",
      description: `${pluralize(pendingAttachmentCount, "attached file")} ${pendingAttachmentCount === 1 ? "is" : "are"} still behind the security boundary. Review the message now, but wait for the recorded scan status before opening a file.`,
      facts,
      recommendsReply: false,
    };
  }

  if (!thread.organizationId) {
    return {
      heading: "Link client context before replying",
      description: "This conversation is not linked to a client account. Confirm who the sender represents so the response and follow-up stay attributable.",
      facts,
      recommendsReply: false,
    };
  }

  if (latestDirection === "inbound") {
    return {
      heading: thread.unreadCount ? "Review the latest client message" : "Decide the next client response",
      description: thread.unreadCount
        ? `${pluralize(thread.unreadCount, "message")} remains unread in this thread. Review the request, reply when appropriate, and record any accountable follow-up.`
        : "The latest message came from the client. Decide whether a reply or a recorded follow-up is needed before the thread goes quiet.",
      facts,
      recommendsReply: true,
    };
  }

  if (latestDirection === "outbound") {
    return {
      heading: "Plan the next client touch",
      description: "The latest message was sent from Costivra. Use the linked account and follow-up work to decide whether to wait, send a reminder, or capture the next accountable step.",
      facts,
      recommendsReply: false,
    };
  }

  return {
    heading: "Confirm the conversation context",
    description: "This thread does not yet have enough delivery context to recommend a response. Confirm the sender, account, and latest message before acting.",
    facts,
    recommendsReply: false,
  };
}
