import { describe, expect, it } from "vitest";

import { derivePlannedSequenceEmails, sequenceMessagePairKey } from "./planned-email-queue";

const ids = {
  sequence: "sequence-1",
  firstStep: "step-1",
  secondStep: "step-2",
  enrollment: "enrollment-1",
  contact: "contact-1",
  organization: "organization-1",
  mailbox: "mailbox-1",
  owner: "owner-1",
};

function queueInput(overrides: Partial<Parameters<typeof derivePlannedSequenceEmails>[0]> = {}) {
  return {
    enrollments: [{
      id: ids.enrollment,
      sequence_id: ids.sequence,
      organization_id: ids.organization,
      contact_id: ids.contact,
      mailbox_id: ids.mailbox,
      state: "active",
      current_step_id: null,
      current_step_position: 0,
      next_action_at: "2026-08-11T14:00:00.000Z",
      personalization: { company_name: "Apex Logistics" },
    }],
    sequences: [{ id: ids.sequence, name: "Renewal follow-up", owner_id: ids.owner, status: "active", execution_enabled: true }],
    steps: [
      { id: ids.firstStep, sequence_id: ids.sequence, position: 1, step_type: "automatic_email", subject_template: "Hi {{first_name}} at {{company_name}}", body_text: "A quick note for {{full_name}}." },
      { id: ids.secondStep, sequence_id: ids.sequence, position: 2, step_type: "call_task", task_title_template: "Call {{full_name}}" },
    ],
    contacts: [{ id: ids.contact, full_name: "Ava Rivera", email: "ava@example.com", title: "Controller" }],
    organizations: [{ id: ids.organization, name: "Northstar Foods" }],
    mailboxes: [{ id: ids.mailbox, address: "lewis@costivra.ai" }],
    profiles: [{ id: ids.owner, full_name: "Lewis Patterson", job_title: "Owner" }],
    messagePairs: new Set<string>(),
    ...overrides,
  };
}

describe("planned sequence email queue", () => {
  it("projects the active enrollment's next automatic email without creating a message record", () => {
    expect(derivePlannedSequenceEmails(queueInput())).toEqual([
      expect.objectContaining({
        id: `queue:${ids.enrollment}:${ids.firstStep}`,
        recordKind: "planned",
        providerStatus: "queued",
        subject: "Hi Ava at Apex Logistics",
        scheduledAt: "2026-08-11T14:00:00.000Z",
        externalSideEffectId: null,
        threadId: null,
      }),
    ]);
  });

  it("does not show non-email steps, paused sequences, or a plan that already has a message", () => {
    expect(derivePlannedSequenceEmails(queueInput({
      enrollments: [{
        id: ids.enrollment,
        sequence_id: ids.sequence,
        organization_id: ids.organization,
        contact_id: ids.contact,
        mailbox_id: ids.mailbox,
        state: "active",
        current_step_id: ids.secondStep,
        current_step_position: 2,
        next_action_at: "2026-08-11T14:00:00.000Z",
      }],
    }))).toEqual([]);

    expect(derivePlannedSequenceEmails(queueInput({
      sequences: [{ id: ids.sequence, name: "Renewal follow-up", owner_id: ids.owner, status: "paused", execution_enabled: false }],
    }))).toEqual([]);

    expect(derivePlannedSequenceEmails(queueInput({
      messagePairs: new Set([sequenceMessagePairKey(ids.enrollment, ids.firstStep)]),
    }))).toEqual([]);
  });
});
