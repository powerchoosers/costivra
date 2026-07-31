import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"','""')}"`; }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    const { data: report } = await db.from("report_definitions").select("id,name,report_type").eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    let headers: string[] = [];
    let values: unknown[][] = [];
    if (report.report_type === "renewal_calendar") {
      const { data, error } = await db.from("contracts").select("title,category,end_date,notice_period_days,annual_value,status").eq("organization_id", organizationId).order("end_date");
      if (error) throw error; headers = ["Contract","Category","End date","Notice days","Annual value","Status"]; values = (data ?? []).map((row) => [row.title,row.category,row.end_date,row.notice_period_days,row.annual_value,row.status]);
    } else if (report.report_type === "vendor_concentration") {
      const { data, error } = await db.from("organization_vendors").select("annualized_spend,relationship_status,vendors(canonical_name,category)").eq("organization_id", organizationId).order("annualized_spend", { ascending: false });
      if (error) throw error; headers = ["Vendor","Category","Annualized spend","Status"]; values = (data ?? []).map((row) => { const vendor = row.vendors as unknown as {canonical_name?:string;category?:string} | null; return [vendor?.canonical_name,vendor?.category,row.annualized_spend,row.relationship_status]; });
    } else if (report.report_type === "data_coverage") {
      const { data, error } = await db.from("documents").select("original_filename,document_type,status,page_count,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false });
      if (error) throw error; headers = ["Document","Type","Status","Pages","Added"]; values = (data ?? []).map((row) => [row.original_filename,row.document_type,row.status,row.page_count,row.created_at]);
    } else {
      const { data, error } = await db.from("opportunities").select("title,status,confidence,estimated_annual_value,deadline_at,category").eq("organization_id", organizationId).order("estimated_annual_value", { ascending: false });
      if (error) throw error; headers = ["Opportunity","Category","Status","Confidence","Estimated annual value","Deadline"]; values = (data ?? []).map((row) => [row.title,row.category,row.status,row.confidence,row.estimated_annual_value,row.deadline_at]);
    }
    const csv = [headers.map(csvCell).join(','), ...values.map((row) => row.map(csvCell).join(','))].join('\r\n');
    await db.from("report_definitions").update({ last_generated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${report.report_type}.csv"` } });
  } catch (error) { return apiError(error); }
}
