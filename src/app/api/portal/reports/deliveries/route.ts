import { NextResponse } from "next/server";
import { apiError } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

/** Return tenant-scoped report delivery history for the existing Reports view. */
export async function GET() {
  try {
    const { db, organizationId } = await requirePortalContext();
    const { data, error } = await db
      .from("report_delivery_runs")
      .select("id,report_definition_id,report_schedule_id,scheduled_for,status,provider_message_id,generated_at,completed_at,safe_error,report_definitions(name)")
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
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
