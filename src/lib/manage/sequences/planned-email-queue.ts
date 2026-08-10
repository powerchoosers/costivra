import { renderTemplate, sanitizeSequencePersonalization } from "./validation";

type Row = Record<string, unknown>;

export type PlannedSequenceEmail = {
  id: string;
  recordKind: "planned";
  threadId: null;
  organizationId: string | null;
  accountName: string;
  contactName: string;
  recipient: string;
  sequenceId: string;
  sequenceName: string;
  ownerId: string | null;
  enrollmentId: string;
  enrollmentState: "active";
  stepId: string;
  stepPosition: number;
  stepType: "automatic_email";
  mailboxId: string | null;
  mailboxAddress: string;
  providerMessageId: null;
  providerStatus: "queued";
  subject: string;
  previewText: string;
  scheduledAt: string;
  sentAt: null;
  nextActionAt: string;
  stopReason: string | null;
  externalSideEffectId: null;
  sideEffect: null;
  latestEvent: null;
};

const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const nullable = (value: unknown) =>
  typeof value === "string" && value ? value : null;
const number = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function sequenceMessagePairKey(
  enrollmentId: string | null | undefined,
  stepId: string | null | undefined,
) {
  return enrollmentId && stepId ? `${enrollmentId}:${stepId}` : "";
}

/**
 * Produces read-only queue rows from the next action held by an active
 * enrollment. These rows intentionally do not create an email message or an
 * external-side-effect record: neither exists until the worker is ready to
 * make the provider request.
 */
export function derivePlannedSequenceEmails(input: {
  enrollments: Row[];
  sequences: Row[];
  steps: Row[];
  contacts: Row[];
  organizations: Row[];
  mailboxes: Row[];
  profiles?: Row[];
  messagePairs?: ReadonlySet<string>;
}): PlannedSequenceEmail[] {
  const sequences = new Map(input.sequences.map((row) => [text(row.id), row]));
  const steps = new Map(input.steps.map((row) => [text(row.id), row]));
  const contacts = new Map(input.contacts.map((row) => [text(row.id), row]));
  const organizations = new Map(input.organizations.map((row) => [text(row.id), row]));
  const mailboxes = new Map(input.mailboxes.map((row) => [text(row.id), row]));
  const profiles = new Map((input.profiles ?? []).map((row) => [text(row.id), row]));
  const stepsBySequence = new Map<string, Row[]>();
  for (const step of input.steps) {
    const sequenceId = text(step.sequence_id);
    if (!sequenceId) continue;
    const current = stepsBySequence.get(sequenceId) ?? [];
    current.push(step);
    stepsBySequence.set(sequenceId, current);
  }
  for (const sequenceSteps of stepsBySequence.values()) {
    sequenceSteps.sort((left, right) => number(left.position) - number(right.position));
  }

  const rows: PlannedSequenceEmail[] = [];
  for (const enrollment of input.enrollments) {
    const enrollmentId = text(enrollment.id);
    const sequenceId = text(enrollment.sequence_id);
    const nextActionAt = nullable(enrollment.next_action_at);
    if (!enrollmentId || !sequenceId || !nextActionAt || text(enrollment.state) !== "active") continue;

    const sequence = sequences.get(sequenceId);
    if (!sequence || text(sequence.status) !== "active" || sequence.execution_enabled !== true) continue;

    const currentStepId = nullable(enrollment.current_step_id);
    const step = currentStepId
      ? steps.get(currentStepId)
      : stepsBySequence.get(sequenceId)?.find((candidate) =>
          number(candidate.position) === number(enrollment.current_step_position) + 1,
        );
    if (!step || text(step.sequence_id) !== sequenceId || text(step.step_type) !== "automatic_email") continue;

    const stepId = text(step.id);
    const messagePair = sequenceMessagePairKey(enrollmentId, stepId);
    if (!stepId || (messagePair && input.messagePairs?.has(messagePair))) continue;

    const contact = contacts.get(text(enrollment.contact_id));
    const recipient = text(contact?.email).trim();
    if (!recipient) continue;
    const organization = organizations.get(text(enrollment.organization_id));
    const owner = profiles.get(text(sequence.owner_id));
    const fullName = text(contact?.full_name, "there").trim() || "there";
    const variables = {
      first_name: fullName.split(/\s+/)[0] || fullName,
      full_name: fullName,
      company_name: text(organization?.name),
      job_title: text(contact?.title),
      industry: "",
      website: "",
      sender_name: text(owner?.full_name, "Costivra"),
      sender_title: text(owner?.job_title),
      ...sanitizeSequencePersonalization(enrollment.personalization),
    };
    const subject = renderTemplate(text(step.subject_template), variables).trim() || "(No subject)";
    const previewText = renderTemplate(text(step.body_text) || text(step.body_html), variables)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    const mailbox = mailboxes.get(text(enrollment.mailbox_id));

    rows.push({
      id: `queue:${enrollmentId}:${stepId}`,
      recordKind: "planned",
      threadId: null,
      organizationId: nullable(enrollment.organization_id),
      accountName: text(organization?.name, "Unknown account"),
      contactName: text(contact?.full_name, recipient),
      recipient,
      sequenceId,
      sequenceName: text(sequence.name, "Sequence"),
      ownerId: nullable(sequence.owner_id),
      enrollmentId,
      enrollmentState: "active",
      stepId,
      stepPosition: number(step.position),
      stepType: "automatic_email",
      mailboxId: nullable(enrollment.mailbox_id),
      mailboxAddress: text(mailbox?.address),
      providerMessageId: null,
      providerStatus: "queued",
      subject,
      previewText,
      scheduledAt: nextActionAt,
      sentAt: null,
      nextActionAt,
      stopReason: nullable(enrollment.stop_reason),
      externalSideEffectId: null,
      sideEffect: null,
      latestEvent: null,
    });
  }

  return rows.sort((left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt));
}
