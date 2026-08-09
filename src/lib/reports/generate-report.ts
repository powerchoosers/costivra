import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { categoryIntelligence } from "@/lib/category-intelligence/service";
import { buildCategoryIntelligenceReportRows } from "@/lib/category-intelligence/report-summary";

export type ReportDefinition = { id: string; organization_id: string; name: string; description: string; report_type: string };
export type GeneratedReport = { definition: ReportDefinition; headers: string[]; values: unknown[][]; summary: Array<{ label: string; value: string }>; generatedAt: string };
const cell = (value: unknown) => value == null ? "" : String(value);

export async function generateReport(db: SupabaseClient, definition: ReportDefinition): Promise<GeneratedReport> {
  const org = definition.organization_id;
  let headers: string[] = []; let values: unknown[][] = [];
  if (definition.report_type === "renewal_calendar") {
    const { data, error } = await db.from("contracts").select("title,category,end_date,notice_period_days,annual_value,status").eq("organization_id", org).order("end_date"); if (error) throw error;
    headers = ["Contract", "Category", "End date", "Notice days", "Annual value", "Status"]; values = (data ?? []).map((row) => [row.title, row.category, row.end_date, row.notice_period_days, row.annual_value, row.status]);
  } else if (definition.report_type === "vendor_concentration") {
    const { data, error } = await db.from("organization_vendors").select("annualized_spend,relationship_status,vendors(canonical_name,category)").eq("organization_id", org).order("annualized_spend", { ascending: false }); if (error) throw error;
    headers = ["Vendor", "Category", "Annualized spend", "Status"]; values = (data ?? []).map((row) => { const vendor = row.vendors as unknown as { canonical_name?: string; category?: string } | null; return [vendor?.canonical_name, vendor?.category, row.annualized_spend, row.relationship_status]; });
  } else if (definition.report_type === "data_coverage") {
    const { data, error } = await db.from("documents").select("original_filename,document_type,status,page_count,created_at").eq("organization_id", org).order("created_at", { ascending: false }); if (error) throw error;
    headers = ["Document", "Type", "Status", "Pages", "Added"]; values = (data ?? []).map((row) => [row.original_filename, row.document_type, row.status, row.page_count, row.created_at]);
  } else if (definition.report_type === "findings_digest") {
    const { data, error } = await db.from("opportunities").select("title,category,status,confidence,estimated_annual_value,deadline_at").eq("organization_id", org).order("estimated_annual_value", { ascending: false }); if (error) throw error;
    headers = ["Finding", "Category", "Status", "Confidence", "Potential annual value", "Deadline"]; values = (data ?? []).map((row) => [row.title, row.category, row.status, row.confidence, row.estimated_annual_value, row.deadline_at]);
  } else if (definition.report_type === "executive_value") {
    const [invoicesResult, analysesResult, opportunitiesResult, savingsResult] = await Promise.all([
      db.from("invoices").select("id,expense_category,metadata").eq("organization_id", org),
      db.from("category_analysis_runs").select("invoice_id,pack_version,missing_dimensions,live_sources_used").eq("organization_id", org),
      db.from("opportunities").select("estimated_annual_value").eq("organization_id", org),
      db.from("savings_outcomes").select("amount,status").eq("organization_id", org),
    ]);
    for (const result of [invoicesResult, analysesResult, opportunitiesResult, savingsResult]) if (result.error) throw result.error;
    const categoryKeys = new Set((invoicesResult.data ?? []).flatMap((invoice) => { const meta = invoice.metadata && typeof invoice.metadata === "object" && !Array.isArray(invoice.metadata) ? invoice.metadata as Record<string, unknown> : null; const trace = meta?.categoryIntelligence && typeof meta.categoryIntelligence === "object" ? meta.categoryIntelligence as Record<string, unknown> : null; return typeof trace?.categoryKey === "string" ? [trace.categoryKey] : []; }));
    const statuses = await Promise.all([...categoryKeys].map(async (key) => [key, (await categoryIntelligence.getExpertPackWithResolution(key)).status] as const));
    const rows = buildCategoryIntelligenceReportRows({
      invoices: (invoicesResult.data ?? []).map((row) => ({ id: row.id, expenseCategory: row.expense_category, metadata: row.metadata })),
      analyses: (analysesResult.data ?? []).map((row) => ({ invoiceId: row.invoice_id, packVersion: row.pack_version, missingDimensions: row.missing_dimensions, liveSourcesUsed: row.live_sources_used })),
      opportunities: (opportunitiesResult.data ?? []).map((row) => ({ estimatedAnnualValue: row.estimated_annual_value })),
      savings: (savingsResult.data ?? []).map((row) => ({ amount: row.amount, status: row.status })),
      packStatusByKey: new Map(statuses),
    });
    headers = ["Metric", "Value", "Status", "Detail"]; values = rows.map((row) => [row.metric, row.value, row.status, row.detail]);
  } else {
    const { data, error } = await db.from("opportunities").select("title,category,status,confidence,estimated_annual_value,deadline_at").eq("organization_id", org).order("estimated_annual_value", { ascending: false }); if (error) throw error;
    headers = ["Finding", "Category", "Status", "Confidence", "Potential annual value", "Deadline"]; values = (data ?? []).map((row) => [row.title, row.category, row.status, row.confidence, row.estimated_annual_value, row.deadline_at]);
  }
  const summary = [{ label: "Rows", value: String(values.length) }, { label: "Report", value: definition.name }, { label: "Generated", value: new Date().toISOString() }];
  return { definition, headers, values, summary, generatedAt: new Date().toISOString() };
}

export function reportCsv(report: GeneratedReport) {
  const csvCell = (value: unknown) => `"${cell(value).replaceAll('"', '""')}"`;
  return [report.headers.map(csvCell).join(","), ...report.values.map((row) => row.map(csvCell).join(","))].join("\r\n");
}
