import { brandedEmailHtml, escapeEmailHtml } from "@/lib/email/brand";
import type { GeneratedReport } from "./generate-report";

export function renderReportEmail(report: GeneratedReport) {
  const rows = report.values.slice(0, 8).map((row) => `<tr>${row.slice(0, 4).map((value) => `<td style="padding:9px;border-bottom:1px solid #e8ecf2;color:#536074">${escapeEmailHtml(String(value ?? "—"))}</td>`).join("")}</tr>`).join("");
  const text = `${report.definition.name}\n\n${report.summary.map((item) => `${item.label}: ${item.value}`).join("\n")}\n\nOpen the full report in your Costivra workspace.`;
  const html = brandedEmailHtml({ preview: `${report.definition.name} is ready`, heading: report.definition.name, bodyHtml: `<p>${escapeEmailHtml(report.definition.description)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px"><thead><tr>${report.headers.slice(0, 4).map((header) => `<th align="left" style="padding:9px;border-bottom:2px solid #dfe4eb;color:#111927">${escapeEmailHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="4" style="padding:12px;color:#6b7789">No meaningful changes in this period.</td></tr>`}</tbody></table>`, cta: { label: "Open report", href: "https://costivra.ai/app/results?view=reports" }, footer: "This report was sent from your Costivra workspace." });
  return { text, html };
}
