import "server-only";

import {
  classifyInboundQueueIncident,
  type InboundQueueHealthRecord,
} from "@/lib/email/inbound-monitor-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerDatabase = ReturnType<typeof createServerSupabaseClient>;

function organizationName(record: InboundQueueHealthRecord) {
  const relation = Array.isArray(record.organizations)
    ? record.organizations[0]
    : record.organizations;
  return relation?.name?.trim().slice(0, 160) || "Customer workspace";
}

export async function monitorInboundEmailQueue(
  db: ServerDatabase = createServerSupabaseClient(),
  now = new Date(),
) {
  const lookback = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000).toISOString();
  const { data: records, error: recordError } = await db
    .from("inbound_email_events")
    .select(
      "id,organization_id,status,attempt_count,max_attempts,error_message,received_at,updated_at,organizations(name)",
    )
    .in("status", ["queued", "processing", "retrying", "dead_letter", "quarantined"])
    .gte("received_at", lookback)
    .order("received_at", { ascending: true })
    .limit(100);
  if (recordError) throw recordError;

  const incidents = ((records ?? []) as InboundQueueHealthRecord[]).flatMap((record) => {
    const incident = classifyInboundQueueIncident(record, now.getTime());
    return incident ? [{ record, incident }] : [];
  });
  if (!incidents.length) return { inspected: records?.length ?? 0, incidents: 0, created: 0 };

  const { data: staff, error: staffError } = await db
    .from("internal_staff_users")
    .select("user_id")
    .eq("status", "active");
  if (staffError) throw staffError;
  const recipientIds = (staff ?? []).map((entry) => entry.user_id as string);
  if (!recipientIds.length) {
    return { inspected: records?.length ?? 0, incidents: incidents.length, created: 0 };
  }

  const notifications = incidents.flatMap(({ record, incident }) =>
    recipientIds.map((recipientUserId) => ({
      organization_id: record.organization_id,
      recipient_user_id: recipientUserId,
      kind: "intake_failure",
      title: incident.title,
      body: `${organizationName(record)} — ${incident.body}`,
      resource_type: "inbound_email_event",
      resource_id: record.id,
      action_href: `/manage/intake/${record.id}`,
      provider_event_id: `intake:${record.id}:${incident.key}`,
    })),
  );
  const providerEventIds = Array.from(
    new Set(notifications.map((notification) => notification.provider_event_id)),
  );
  const { data: existing, error: existingError } = await db
    .from("internal_notifications")
    .select("provider_event_id,recipient_user_id")
    .in("provider_event_id", providerEventIds)
    .in("recipient_user_id", recipientIds);
  if (existingError) throw existingError;
  const existingKeys = new Set(
    (existing ?? []).map(
      (notification) =>
        `${notification.provider_event_id as string}:${notification.recipient_user_id as string}`,
    ),
  );
  const pending = notifications.filter(
    (notification) =>
      !existingKeys.has(`${notification.provider_event_id}:${notification.recipient_user_id}`),
  );
  if (!pending.length) {
    return { inspected: records?.length ?? 0, incidents: incidents.length, created: 0 };
  }
  const { data: inserted, error: insertError } = await db
    .from("internal_notifications")
    .insert(pending)
    .select("id");
  if (insertError?.code !== "23505" && insertError) throw insertError;
  return {
    inspected: records?.length ?? 0,
    incidents: incidents.length,
    created: inserted?.length ?? 0,
  };
}
