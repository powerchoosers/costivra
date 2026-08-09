import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { generateReport, reportCsv } from "@/lib/reports/generate-report";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    const { data: definition, error } = await db.from("report_definitions").select("id,name,description,report_type,organization_id").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (error) throw error;
    if (!definition) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const report = await generateReport(db, definition);
    await db.from("report_definitions").update({ last_generated_at: report.generatedAt, updated_at: report.generatedAt }).eq("id", id).eq("organization_id", organizationId);
    return new NextResponse(reportCsv(report), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${definition.report_type}.csv"` } });
  } catch (error) { return apiError(error); }
}
