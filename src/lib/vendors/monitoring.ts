import type { SupabaseClient } from "@supabase/supabase-js";

export type DurableMonitoringState =
  | "not_configured"
  | "manual_tracking"
  | "pending_test"
  | "review_required"
  | "active"
  | "paused"
  | "attention_needed";

export type MonitoringSourceMethod =
  | "email_forwarding"
  | "manual_forwarding"
  | "manual_upload";

// Backward compatibility alias for UI views
export type MonitoringState =
  | "not_set_up"
  | "test_needed"
  | "active"
  | "attention_needed"
  | "paused"
  | "manual_tracking"
  | "review_required";

export interface VendorMonitoringRecord {
  id?: string;
  relationshipId: string;
  state: DurableMonitoringState;
  sourceMethod: MonitoringSourceMethod;
  approvedSenderAddress?: string | null;
  privateIntakeAddress: string;
  inboundEmailAddressId?: string | null;
  expectedCadenceDays: number;
  gracePeriodDays: number;
  testCompletedAt?: string | null;
  lastReceivedAt?: string | null;
  nextExpectedAt?: string | null;
  pausedAt?: string | null;
  lastFailureCode?: string | null;
}

export function mapDurableStateToUiState(state: DurableMonitoringState | MonitoringState): MonitoringState {
  switch (state) {
    case "not_configured": return "not_set_up";
    case "pending_test": return "test_needed";
    case "manual_tracking": return "manual_tracking";
    case "review_required": return "review_required";
    case "active": return "active";
    case "paused": return "paused";
    case "attention_needed": return "attention_needed";
    case "not_set_up": return "not_set_up";
    case "test_needed": return "test_needed";
    default: return "not_set_up";
  }
}

export function getMonitoringStateLabel(state: MonitoringState | DurableMonitoringState): {
  label: string;
  copy: string;
  badgeClass: string;
} {
  const normalized = mapDurableStateToUiState(state);

  switch (normalized) {
    case "active":
      return {
        label: "Active",
        copy: "Costivra is receiving and processing forwarded bills on schedule.",
        badgeClass: "status-active",
      };
    case "test_needed":
      return {
        label: "Test needed",
        copy: "Forwarding rule configured. Send one test invoice to activate.",
        badgeClass: "status-needs_review",
      };
    case "manual_tracking":
      return {
        label: "Manual tracking",
        copy: "Invoices are manually uploaded or forwarded. Automatic continuous monitoring is not configured.",
        badgeClass: "status-ready",
      };
    case "review_required":
      return {
        label: "Review required",
        copy: "A forwarded bill was received but requires vendor match or human verification.",
        badgeClass: "status-needs_review",
      };
    case "attention_needed":
      return {
        label: "Attention needed",
        copy: "Expected bill not received or an intake error occurred.",
        badgeClass: "status-mismatched",
      };
    case "paused":
      return {
        label: "Paused",
        copy: "Bill monitoring is currently paused for this vendor.",
        badgeClass: "status-inactive",
      };
    case "not_set_up":
    default:
      return {
        label: "Not set up",
        copy: "Set up bill forwarding to automatically monitor future invoices.",
        badgeClass: "status-pending",
      };
  }
}

export function calculateNextExpectedInvoiceDate(
  lastInvoiceDateStr?: string | null,
  cadenceDays: number = 30,
): string | null {
  if (!lastInvoiceDateStr) return null;
  const lastDate = new Date(lastInvoiceDateStr);
  if (isNaN(lastDate.getTime())) return null;
  const nextDate = new Date(lastDate.getTime() + cadenceDays * 24 * 60 * 60 * 1000);
  return nextDate.toISOString().split("T")[0];
}

export function getDynamicPrimaryAction(vendor: {
  documentCount: number;
  hasPendingReviewInvoice: boolean;
  monitoringState: MonitoringState | DurableMonitoringState;
  hasOpenFinding: boolean;
  hasPendingAction: boolean;
}): { label: string; actionKind: "upload" | "review_invoice" | "monitor" | "test_forwarding" | "review_finding" | "review_action" | "view_bill"; href?: string } {
  const normState = mapDurableStateToUiState(vendor.monitoringState);

  if (vendor.documentCount === 0) {
    return { label: "Add first bill", actionKind: "upload" };
  }
  if (vendor.hasPendingReviewInvoice) {
    return { label: "Review invoice", actionKind: "review_invoice", href: "/app/documents" };
  }
  if (normState === "not_set_up") {
    return { label: "Monitor this vendor", actionKind: "monitor" };
  }
  if (normState === "test_needed") {
    return { label: "Finish monitoring test", actionKind: "test_forwarding" };
  }
  if (normState === "review_required") {
    return { label: "Resolve monitoring review", actionKind: "review_invoice", href: "/app/documents" };
  }
  if (vendor.hasOpenFinding) {
    return { label: "Review finding", actionKind: "review_finding", href: "/app/opportunities" };
  }
  if (vendor.hasPendingAction) {
    return { label: "Review action", actionKind: "review_action", href: "/app/actions" };
  }
  return { label: "View latest bill", actionKind: "view_bill", href: "/app/documents" };
}

/**
 * Loads durable vendor monitoring config from DB or returns a default not_configured model
 */
export async function getDurableMonitoringConfig(
  db: SupabaseClient,
  organizationId: string,
  organizationVendorId: string,
): Promise<VendorMonitoringRecord> {
  // 1. Fetch active intake address for org
  const { data: intakeAddr } = await db
    .from("inbound_email_addresses")
    .select("id, local_part, domain, status")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  const privateIntakeAddress = intakeAddr
    ? `${intakeAddr.local_part}@${intakeAddr.domain}`
    : `inbox-${organizationId.slice(0, 8)}@costivra.ai`;

  // 2. Fetch monitoring record
  const { data: config } = await db
    .from("vendor_monitoring_configs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("organization_vendor_id", organizationVendorId)
    .maybeSingle();

  if (!config) {
    return {
      relationshipId: organizationVendorId,
      state: "not_configured",
      sourceMethod: "email_forwarding",
      privateIntakeAddress,
      inboundEmailAddressId: intakeAddr?.id ?? null,
      expectedCadenceDays: 30,
      gracePeriodDays: 7,
    };
  }

  return {
    id: config.id,
    relationshipId: organizationVendorId,
    state: config.state as DurableMonitoringState,
    sourceMethod: config.source_method as MonitoringSourceMethod,
    approvedSenderAddress: config.approved_sender_address,
    privateIntakeAddress,
    inboundEmailAddressId: config.inbound_email_address_id || intakeAddr?.id || null,
    expectedCadenceDays: config.expected_cadence_days || 30,
    gracePeriodDays: config.grace_period_days || 7,
    testCompletedAt: config.test_completed_at,
    lastReceivedAt: config.last_received_at,
    nextExpectedAt: config.next_expected_at,
    pausedAt: config.paused_at,
    lastFailureCode: config.last_failure_code,
  };
}

/**
 * Saves or updates a durable vendor monitoring config with audit event logging
 */
export async function saveDurableMonitoringConfig(
  db: SupabaseClient,
  params: {
    organizationId: string;
    actorId: string;
    organizationVendorId: string;
    sourceMethod: MonitoringSourceMethod;
    approvedSenderAddress?: string | null;
    expectedCadenceDays?: number;
  },
): Promise<VendorMonitoringRecord> {
  const { organizationId, actorId, organizationVendorId, sourceMethod, approvedSenderAddress, expectedCadenceDays = 30 } = params;

  // 1. Fetch active intake address
  const { data: intakeAddr } = await db
    .from("inbound_email_addresses")
    .select("id, local_part, domain")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  const initialState: DurableMonitoringState =
    sourceMethod === "email_forwarding" ? "pending_test" : "manual_tracking";

  const payload = {
    organization_id: organizationId,
    organization_vendor_id: organizationVendorId,
    inbound_email_address_id: intakeAddr?.id ?? null,
    source_method: sourceMethod,
    state: initialState,
    approved_sender_address: approvedSenderAddress || null,
    expected_cadence_days: expectedCadenceDays,
    grace_period_days: 7,
    updated_by: actorId,
  };

  const { data: upserted, error } = await db
    .from("vendor_monitoring_configs")
    .upsert(payload, { onConflict: "organization_vendor_id" })
    .select("*")
    .single();

  if (error) throw error;

  // Record audit event
  await db.from("audit_events").insert({
    organization_id: organizationId,
    actor_id: actorId,
    event_type: "vendor_monitoring_configured",
    resource_type: "organization_vendor",
    resource_id: organizationVendorId,
    payload: {
      sourceMethod,
      approvedSenderAddress,
      state: initialState,
      configId: upserted.id,
    },
  });

  return getDurableMonitoringConfig(db, organizationId, organizationVendorId);
}
