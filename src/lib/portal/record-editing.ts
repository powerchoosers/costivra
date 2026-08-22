import { PortalInputError } from "@/lib/portal/http";

export const editableResources = {
  vendor: {
    table: "organization_vendors",
    fields: {
      relationshipStatus: { column: "relationship_status", kind: "enum", values: ["active", "paused", "ended"] },
      annualizedSpend: { column: "annualized_spend", kind: "money" },
      spendCadence: { column: "spend_cadence", kind: "enum", values: ["monthly", "quarterly", "annual", "variable"] },
    },
  },
  expense: {
    table: "expenses",
    fields: {
      category: { column: "category", kind: "text", max: 100 },
      periodStart: { column: "period_start", kind: "date" },
      periodEnd: { column: "period_end", kind: "date" },
      status: { column: "status", kind: "enum", values: ["processing", "needs_review", "reviewed", "archived"] },
      locationId: { column: "location_id", kind: "nullable_uuid" },
    },
  },
  contract: {
    table: "contracts",
    fields: {
      title: { column: "title", kind: "text", max: 200 },
      category: { column: "category", kind: "text", max: 100 },
      startDate: { column: "start_date", kind: "nullable_date" },
      endDate: { column: "end_date", kind: "nullable_date" },
      noticePeriodDays: { column: "notice_period_days", kind: "nullable_integer", min: 0, max: 3650 },
      annualValue: { column: "annual_value", kind: "nullable_money" },
      status: { column: "status", kind: "enum", values: ["draft", "active", "expired", "terminated"] },
      autoRenews: { column: "auto_renews", kind: "boolean" },
      ownerName: { column: "owner_name", kind: "nullable_text", max: 120 },
      locationId: { column: "location_id", kind: "nullable_uuid" },
    },
  },
  document: {
    table: "documents",
    fields: {
      documentType: { column: "document_type", kind: "nullable_text", max: 80 },
      summary: { column: "extraction_summary", kind: "nullable_text", max: 1200 },
    },
  },
  invoice: {
    table: "invoices",
    fields: {
      invoiceNumber: { column: "invoice_number", kind: "nullable_text", max: 100 },
      invoiceDate: { column: "invoice_date", kind: "nullable_date" },
      dueDate: { column: "due_date", kind: "nullable_date" },
      servicePeriodStart: { column: "service_period_start", kind: "nullable_date" },
      servicePeriodEnd: { column: "service_period_end", kind: "nullable_date" },
      purchaseOrderNumber: { column: "purchase_order_number", kind: "nullable_text", max: 100 },
      expenseCategory: { column: "expense_category", kind: "nullable_text", max: 100 },
      reviewPriority: { column: "review_priority", kind: "enum", values: ["low", "normal", "high", "urgent"] },
      reviewNotes: { column: "review_notes", kind: "nullable_text", max: 2000 },
      locationId: { column: "location_id", kind: "nullable_uuid" },
    },
  },
  opportunity: {
    table: "opportunities",
    fields: {
      title: { column: "title", kind: "text", max: 200 },
      summary: { column: "summary", kind: "text", max: 1600 },
      priority: { column: "priority", kind: "enum", values: ["low", "medium", "high"] },
      deadlineAt: { column: "deadline_at", kind: "nullable_datetime" },
    },
  },
  action: {
    table: "action_plans",
    fields: {
      title: { column: "title", kind: "nullable_text", max: 200 },
      description: { column: "description", kind: "nullable_text", max: 1600 },
      priority: { column: "priority", kind: "enum", values: ["low", "medium", "high", "urgent"] },
      dueAt: { column: "due_at", kind: "nullable_datetime" },
    },
  },
  savings: {
    table: "savings_outcomes",
    fields: {
      title: { column: "title", kind: "text", max: 200 },
    },
  },
} as const;

export type EditableResource = keyof typeof editableResources;

type FieldRule = { readonly column: string; readonly kind: string; readonly values?: readonly string[]; readonly max?: number; readonly min?: number };

export function normalizeRecordField(resource: string, field: string, value: unknown) {
  const config = editableResources[resource as EditableResource];
  if (!config) throw new PortalInputError("Unsupported record type.");
  const rule = (config.fields as Record<string, FieldRule>)[field];
  if (!rule) throw new PortalInputError("That field is protected or cannot be edited here.");
  if (rule.kind === "boolean") {
    if (typeof value !== "boolean") throw new PortalInputError("Enter a valid yes or no value.");
    return { column: rule.column, value };
  }
  if (rule.kind === "nullable_uuid") {
    if (value === "" || value == null) return { column: rule.column, value: null };
    const uuid = typeof value === "string" ? value.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid))
      throw new PortalInputError("Choose a valid location.");
    return { column: rule.column, value: uuid };
  }
  if (["money", "nullable_money", "nullable_integer"].includes(rule.kind)) {
    if ((value === "" || value == null) && rule.kind.startsWith("nullable")) return { column: rule.column, value: null };
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < (rule.min ?? 0) || parsed > (rule.max ?? Number.MAX_SAFE_INTEGER)) throw new PortalInputError("Enter a valid non-negative number.");
    return { column: rule.column, value: rule.kind === "nullable_integer" ? Math.round(parsed) : parsed };
  }
  const text = typeof value === "string" ? value.trim() : "";
  if (rule.kind === "enum") {
    if (!rule.values?.includes(text)) throw new PortalInputError("Choose a valid option.");
    return { column: rule.column, value: text };
  }
  if (["date", "nullable_date", "nullable_datetime"].includes(rule.kind)) {
    if (!text && rule.kind.startsWith("nullable")) return { column: rule.column, value: null };
    const valid = rule.kind === "nullable_datetime" ? !Number.isNaN(Date.parse(text)) : /^\d{4}-\d{2}-\d{2}$/.test(text);
    if (!valid) throw new PortalInputError("Enter a valid date.");
    return { column: rule.column, value: text };
  }
  if (!text && rule.kind === "text") throw new PortalInputError("This field cannot be blank.");
  if (text.length > (rule.max ?? 500)) throw new PortalInputError(`Keep this field under ${rule.max ?? 500} characters.`);
  return { column: rule.column, value: text || null };
}
