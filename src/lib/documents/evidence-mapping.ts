export type EvidenceReferenceForMapping = {
  id: string;
  fieldPath?: string | null;
  sourceKey?: string | null;
};

type ParsedLineItemPath = {
  index: number;
};

const bracketLineItemPath = /^invoice\.lineItems\[(\d+)\](?:\.|$)/;
const dottedLineItemPath = /^invoice\.lineItems\.(\d+)(?:\.|$)/;

function parseLineItemPath(fieldPath: string | null | undefined): ParsedLineItemPath | null {
  if (!fieldPath) return null;
  const match = fieldPath.match(bracketLineItemPath) ?? fieldPath.match(dottedLineItemPath);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 0 ? { index } : null;
}

/**
 * Returns the evidence rows that belong to one extracted line item.
 *
 * Source keys are preferred because they survive line-item reordering. The
 * indexed field-path form remains supported for older or simpler model output.
 * Generic `invoice.lineItems` evidence is intentionally not assigned to every
 * row: that would make a broad quote look like proof for a specific charge.
 */
export function evidenceIdsForLineItem(input: {
  evidence: EvidenceReferenceForMapping[];
  lineIndex: number;
  sourceKey?: string | null;
}): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const reference of input.evidence) {
    const sourceKeyMatches = Boolean(
      input.sourceKey && reference.sourceKey && input.sourceKey === reference.sourceKey,
    );
    const pathMatches = parseLineItemPath(reference.fieldPath)?.index === input.lineIndex;
    if ((!sourceKeyMatches && !pathMatches) || !reference.id || seen.has(reference.id)) {
      continue;
    }
    seen.add(reference.id);
    ids.push(reference.id);
  }

  return ids;
}

export function lineItemEvidenceMap(input: {
  evidence: EvidenceReferenceForMapping[];
  lineItems: Array<{ sourceKey?: string | null }>;
}): string[][] {
  return input.lineItems.map((line, lineIndex) =>
    evidenceIdsForLineItem({
      evidence: input.evidence,
      lineIndex,
      sourceKey: line.sourceKey,
    }),
  );
}

