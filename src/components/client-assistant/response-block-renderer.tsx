"use client";

import Link from "next/link";
import { FileText, ArrowRight, ShieldCheck, AlertCircle, Building2, CheckCircle2, TrendingUp } from "lucide-react";
import type { AssistantBlockV1 } from "@/lib/client-assistant/types";

export function ResponseBlockRenderer({ block }: { block: AssistantBlockV1 }) {
  const p = block.payload;

  switch (block.type) {
    case "invoice_summary":
      return (
        <div className="assistant-card-block">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <strong style={{ fontSize: "0.95rem" }}>{String(p.vendorName ?? "Invoice Summary")}</strong>
              <p className="muted" style={{ fontSize: "0.8rem", margin: "2px 0 0" }}>
                Invoice #{String(p.invoiceNumber ?? "N/A")} · Date: {String(p.invoiceDate ?? "N/A")}
              </p>
            </div>
            <strong style={{ fontSize: "1.05rem", color: "var(--assistant-accent)" }}>
              ${Number(p.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: "0.78rem" }}>
            <span style={{ background: "rgba(0,0,0,0.04)", padding: "2px 8px", borderRadius: 4 }}>
              Status: {String(p.reviewStatus ?? "recorded")}
            </span>
            <span style={{ background: "rgba(0,0,0,0.04)", padding: "2px 8px", borderRadius: 4 }}>
              Match: {String(p.vendorMatchStatus ?? "exact")}
            </span>
          </div>
          {Boolean(p.documentId) && (
            <Link
              href={`/app/documents`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", marginTop: 12, color: "var(--assistant-accent)", fontWeight: 500 }}
            >
              <FileText size={14} /> View Source Document <ArrowRight size={12} />
            </Link>
          )}
        </div>
      );

    case "invoice_comparison":
      return (
        <div className="assistant-card-block">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <TrendingUp size={16} style={{ color: "var(--assistant-accent)" }} />
            <strong style={{ fontSize: "0.9rem" }}>Spend Period Comparison ({String(p.vendorName)})</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "var(--assistant-bg)", padding: 12, borderRadius: 8 }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--assistant-muted)", display: "block" }}>Prior Period</span>
              <strong style={{ fontSize: "0.95rem" }}>${Number((p.periodA as Record<string, unknown>)?.amount ?? 0).toFixed(2)}</strong>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--assistant-muted)", display: "block" }}>Latest Period</span>
              <strong style={{ fontSize: "0.95rem" }}>${Number((p.periodB as Record<string, unknown>)?.amount ?? 0).toFixed(2)}</strong>
            </div>
          </div>
          {p.differenceAmount != null && (
            <div style={{ marginTop: 10, fontSize: "0.82rem" }}>
              Difference: <strong>${Number(p.differenceAmount).toFixed(2)}</strong> ({Number(p.percentageChange) > 0 ? "+" : ""}{String(p.percentageChange ?? 0)}%)
            </div>
          )}
        </div>
      );

    case "vendor_summary":
      return (
        <div className="assistant-card-block">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Building2 size={20} style={{ color: "var(--assistant-accent)" }} />
              <div>
                <strong style={{ fontSize: "0.95rem" }}>{String(p.name)}</strong>
                <span style={{ fontSize: "0.78rem", color: "var(--assistant-muted)", display: "block" }}>{String(p.category)}</span>
              </div>
            </div>
            <strong style={{ fontSize: "0.95rem" }}>${Number(p.annualizedSpend ?? 0).toLocaleString()}/yr</strong>
          </div>
          <div style={{ marginTop: 12 }}>
            <Link href={`/app/vendors/${String(p.vendorId ?? "")}`} className="button button-quiet button-sm" style={{ fontSize: "0.78rem" }}>
              Open Vendor Dossier <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      );

    case "opportunity":
      return (
        <div className="assistant-card-block" style={{ borderLeft: "3px solid #10b981" }}>
          <strong style={{ fontSize: "0.92rem", display: "block" }}>{String(p.title)}</strong>
          <p className="muted" style={{ fontSize: "0.8rem", margin: "4px 0 10px" }}>
            Category: {String(p.category)} · {String(p.evidenceCount ?? 0)} evidence references
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--assistant-muted)" }}>Estimated Savings</span>
            <strong style={{ fontSize: "1rem", color: "#10b981" }}>${Number(p.estimatedAnnualSavings ?? 0).toLocaleString()}/yr</strong>
          </div>
        </div>
      );

    case "document_ingestion":
      return (
        <div className="assistant-card-block">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={16} style={{ color: "var(--assistant-accent)" }} />
            <strong style={{ fontSize: "0.88rem" }}>{String(p.filename)}</strong>
          </div>
          <div style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--assistant-muted)" }}>
            Ingestion Status: <strong style={{ color: "var(--assistant-text)" }}>{String(p.status)}</strong>
          </div>
        </div>
      );

    case "notice":
      return (
        <div className="assistant-card-block" style={{ background: "var(--assistant-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={16} style={{ color: p.severity === "error" ? "#ef4444" : "#f59e0b" }} />
            <strong style={{ fontSize: "0.88rem" }}>{String(p.title)}</strong>
          </div>
          <p style={{ fontSize: "0.82rem", margin: "6px 0 0", color: "var(--assistant-muted)" }}>
            {String(p.message)}
          </p>
        </div>
      );

    default:
      return null;
  }
}
