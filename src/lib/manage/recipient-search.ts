import type { ManageContact, ManageStaffMember } from "./types";

export type RecipientCandidate = {
  email: string;
  name: string;
  detail: string;
  source: "account" | "contact" | "staff";
  priority: number;
};

export const normalizeRecipientEmail = (value: string) => value.trim().toLowerCase();

export function splitRecipientValues(value: string | null | undefined) {
  return Array.from(new Set(
    (value ?? "")
      .split(/[;,]/)
      .map(normalizeRecipientEmail)
      .filter(Boolean),
  ));
}

export function isRecipientEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeRecipientEmail(value));
}

export function buildRecipientCandidates(
  contacts: ManageContact[],
  staff: ManageStaffMember[],
  selectedOrganizationId: string,
) {
  const ordered: RecipientCandidate[] = [
    ...contacts
      .filter((contact) => contact.email && contact.organizationId === selectedOrganizationId)
      .map((contact) => ({
        email: normalizeRecipientEmail(contact.email),
        name: contact.fullName,
        detail: `${contact.organizationName}${contact.title ? ` · ${contact.title}` : ""}`,
        source: "account" as const,
        priority: 0,
      })),
    ...contacts
      .filter((contact) => contact.email && contact.organizationId !== selectedOrganizationId)
      .map((contact) => ({
        email: normalizeRecipientEmail(contact.email),
        name: contact.fullName,
        detail: `${contact.organizationName}${contact.title ? ` · ${contact.title}` : ""}`,
        source: "contact" as const,
        priority: 1,
      })),
    ...staff
      .filter((member) => member.email)
      .map((member) => ({
        email: normalizeRecipientEmail(member.email),
        name: member.fullName,
        detail: `Costivra · ${member.role === "owner" ? "Owner" : "Team member"}`,
        source: "staff" as const,
        priority: 2,
      })),
  ];

  const unique = new Map<string, RecipientCandidate>();
  ordered.forEach((candidate) => {
    if (!unique.has(candidate.email)) unique.set(candidate.email, candidate);
  });
  return Array.from(unique.values());
}

export function searchRecipientCandidates(
  candidates: RecipientCandidate[],
  query: string,
  selected: string[],
  limit = 8,
) {
  const needle = query.trim().toLowerCase();
  const selectedSet = new Set(selected.map(normalizeRecipientEmail));
  return candidates
    .filter((candidate) => !selectedSet.has(candidate.email))
    .filter((candidate) => !needle || `${candidate.name} ${candidate.email} ${candidate.detail}`.toLowerCase().includes(needle))
    .sort((left, right) => {
      const leftStarts = needle && (`${left.name} ${left.email}`).toLowerCase().startsWith(needle) ? 0 : 1;
      const rightStarts = needle && (`${right.name} ${right.email}`).toLowerCase().startsWith(needle) ? 0 : 1;
      return leftStarts - rightStarts || left.priority - right.priority || left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}
