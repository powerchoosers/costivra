import { NextResponse } from "next/server";
import { apiError } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

/** Return tenant-scoped report delivery history for the existing Reports view. */
export async function GET() {
  try {
    const { db, organizationId } = await requirePortalContext();
    const { data, error } = await db
      .from("report_delivery_runs")
      .select("id,report_definition_id,report_schedule_id,scheduled_for,status,provider_message_id,generated_at,completed_at,safe_error,report_definitions(name),report_delivery_recipients(id,recipient_email,status,provider_message_id,safe_error,sent_at,completed_at)")
      .eq("organization_id", organizationId)
      .order("scheduled_for", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({
      deliveries: (data ?? []).map((run) => ({
        id: run.id,
        report_definition_id: run.report_definition_id,
        report_schedule_id: run.report_schedule_id,
        scheduled_for: run.scheduled_for,
        status: run.status,
        provider_message_id: run.provider_message_id,
        generated_at: run.generated_at,
        completed_at: run.completed_at,
        safe_error: run.safe_error,
        report_name: (run.report_definitions as unknown as { name?: string } | null)?.name ?? "Report",
        recipients: Array.isArray(run.report_delivery_recipients)
          ? run.report_delivery_recipients.map((recipient) => ({
              id: recipient.id,
              email: recipient.recipient_email,
              status: recipient.status,
              provider_message_id: recipient.provider_message_id,
              safe_error: recipient.safe_error,
              sent_at: recipient.sent_at,
              completed_at: recipient.completed_at,
            }))
          : [],
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
