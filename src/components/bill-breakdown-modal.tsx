import { useEffect, useState } from "react";
import {
  X,
  FileText,
  ShieldCheck,
  Building2,
  TrendingUp,
  AlertTriangle,
  Download,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useClientAssistant } from "@/components/client-assistant/client-assistant-provider";

export type BreakdownData = {
  document: {
    id: string;
    filename: string;
    mimeType: string;
    byteSize: number;
    status: string;
    extractionSummary: string | null;
    createdAt: string;
    securityScanStatus: string;
    securityScannedAt: string;
    sha256Digest: string;
    downloadUrl: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    dueDate: string | null;
    totalAmount: number | null;
    subtotalAmount: number | null;
    taxAmount: number | null;
    currency: string;
    reviewStatus: string;
    vendorMatchStatus: string;
    reconciliationStatus: string;
  } | null;
  vendor: {
    id: string;
    name: string;
    category: string;
    website: string | null;
    catalogStatus: string;
    logoUrl: string | null;
    annualizedSpend: number;
  } | null;
  lineItems: Array<{
    id: string;
    lineNumber: number;
    description: string;
    amount: number;
    quantity?: number;
    unitPrice?: number;
  }>;
  evidence: Array<{
    id: string;
    pageNumber: number;
    textExcerpt: string;
    fieldPath: string | null;
  }>;
  anomalies: Array<{
    type: "warning" | "alert" | "info";
    title: string;
    message: string;
  }>;
  marketBenchmark: {
    category: string;
    billedAmount: number;
    estimatedMarketRate: number;
    variancePercentage: number;
    potentialAnnualSavings: number;
    benchmarkSource: string;
  };
  guidance: Array<{
    title: string;
    action: string;
    priority: string;
  }>;
};

export function BillBreakdownModal({
  documentId,
  onClose,
}: {
  documentId: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BreakdownData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { openDrawer, setContext } = useClientAssistant();

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/portal/documents/${documentId}/breakdown`)
      .then(async (res) => {
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.error || "Failed to load document analysis.");
        }
        return res.json();
      })
      .then((json: BreakdownData) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error loading document.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && documentId) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [documentId, onClose]);

  if (!documentId) return null;

  const handleAskAssistant = () => {
    if (data?.document.id) {
      setContext({ kind: "document", id: data.document.id });
      onClose();
      openDrawer();
    }
  };

  const isPdf = data?.document.mimeType === "application/pdf" || data?.document.filename.toLowerCase().endsWith(".pdf");
  const isImage = data?.document.mimeType.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/i.test(data?.document.filename || "");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(10, 15, 29, 0.75)",
        backdropFilter: "blur(8px)",
        padding: "20px",
        animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "95vw",
          maxWidth: "1560px",
          height: "92vh",
          background: "#0f172a",
          color: "#f8fafc",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header Bar */}
        <header
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(30, 41, 59, 0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(0, 47, 167, 0.3)",
                border: "1px solid rgba(0, 47, 167, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60a5fa",
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0, color: "#ffffff" }}>
                  {data?.vendor?.name ? `${data.vendor.name} — Invoice Breakdown` : data?.document.filename ?? "Document Breakdown"}
                </h2>
                {data?.document.securityScanStatus === "passed" && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.72rem",
                      fontWeight: 500,
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#34d399",
                      padding: "2px 8px",
                      borderRadius: 12,
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <ShieldCheck size={13} /> Security Scan Passed
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "2px 0 0" }}>
                {data?.document.filename} · {(Number(data?.document.byteSize ?? 0) / 1024).toFixed(1)} KB · Scanned SHA-256
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleAskAssistant}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: "linear-gradient(135deg, #002FA7 0%, #1d4ed8 100%)",
                color: "#ffffff",
                border: "none",
                fontSize: "0.82rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Sparkles size={15} /> Ask Costivra AI
            </button>
            {data?.document.downloadUrl && (
              <a
                href={data.document.downloadUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                <Download size={15} /> Download Original
              </a>
            )}
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        {loading ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading file analysis & extraction breakdown...</p>
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <AlertTriangle size={36} style={{ color: "#f87171" }} />
            <p style={{ color: "#f87171", fontSize: "0.95rem" }}>{error}</p>
            <button onClick={onClose} className="button button-quiet" style={{ color: "#cbd5e1" }}>
              Close Modal
            </button>
          </div>
        ) : data ? (
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", minHeight: 0, overflow: "hidden" }}>
            {/* Left Column: PDF / File Preview */}
            <div
              style={{
                borderRight: "1px solid rgba(255, 255, 255, 0.1)",
                background: "#020617",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "8px 16px",
                  background: "rgba(15, 23, 42, 0.8)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.78rem",
                  color: "#94a3b8",
                }}
              >
                <span>SOURCE FILE PREVIEW ({data.document.filename})</span>
                <span style={{ color: "#34d399", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={13} /> Verified Clean
                </span>
              </div>
              <div style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}>
                {isPdf ? (
                  <iframe
                    src={`${data.document.downloadUrl}#toolbar=0`}
                    title="PDF Viewer"
                    style={{ width: "100%", height: "100%", border: "none", background: "#ffffff" }}
                  />
                ) : isImage ? (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: 20 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.document.downloadUrl} alt={data.document.filename} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
                  </div>
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#94a3b8" }}>
                    <FileText size={48} style={{ opacity: 0.5 }} />
                    <p style={{ fontSize: "0.9rem" }}>Text document preview available via raw download.</p>
                    <a href={data.document.downloadUrl} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", fontSize: "0.85rem" }}>
                      Open raw document file <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Breakdown Panel */}
            <div style={{ overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Section 1: Extracted Key Fields */}
              <div
                style={{
                  background: "rgba(30, 41, 59, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Building2 size={18} style={{ color: "#60a5fa" }} />
                    <strong style={{ fontSize: "0.95rem", color: "#f8fafc" }}>
                      {data.vendor?.name ?? "Vendor Unmatched"}
                    </strong>
                  </div>
                  {data.vendor?.category && (
                    <span style={{ fontSize: "0.75rem", background: "rgba(96, 165, 250, 0.15)", color: "#93c5fd", padding: "3px 10px", borderRadius: 12, border: "1px solid rgba(96, 165, 250, 0.3)" }}>
                      {data.vendor.category}
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>Total Amount</span>
                    <strong style={{ fontSize: "1.1rem", color: "#34d399" }}>
                      ${(data.invoice?.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>Invoice #</span>
                    <strong style={{ fontSize: "0.9rem", color: "#f8fafc" }}>
                      {data.invoice?.invoiceNumber ?? "N/A"}
                    </strong>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>Invoice Date</span>
                    <strong style={{ fontSize: "0.9rem", color: "#f8fafc" }}>
                      {data.invoice?.invoiceDate ?? "N/A"}
                    </strong>
                  </div>
                </div>

                {data.lineItems.length > 0 && (
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Extracted Line Items ({data.lineItems.length})
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {data.lineItems.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "0.8rem",
                            background: "rgba(15, 23, 42, 0.4)",
                            padding: "6px 10px",
                            borderRadius: 6,
                          }}
                        >
                          <span style={{ color: "#cbd5e1" }}>{item.description}</span>
                          <strong style={{ color: "#f8fafc" }}>${item.amount.toFixed(2)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Anomalies & Flags */}
              {data.anomalies.length > 0 && (
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: "14px",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <AlertTriangle size={16} style={{ color: "#fbbf24" }} />
                    <strong style={{ fontSize: "0.88rem", color: "#fbbf24" }}>Detected Anomalies & Considerations</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.anomalies.map((item, idx) => (
                      <div key={idx} style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                        <strong style={{ color: "#f8fafc" }}>{item.title}: </strong>
                        {item.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Market Benchmark Comparison */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  borderRadius: "14px",
                  padding: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={18} style={{ color: "#60a5fa" }} />
                    <strong style={{ fontSize: "0.92rem", color: "#f8fafc" }}>Market Intelligence Benchmark</strong>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{data.marketBenchmark.category}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: 12, borderRadius: 8 }}>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>Regional Market Avg</span>
                    <strong style={{ fontSize: "1.05rem", color: "#60a5fa" }}>${data.marketBenchmark.estimatedMarketRate.toFixed(2)}</strong>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.5)", padding: 12, borderRadius: 8 }}>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", display: "block" }}>Rate Variance</span>
                    <strong style={{ fontSize: "1.05rem", color: data.marketBenchmark.variancePercentage > 0 ? "#f87171" : "#34d399" }}>
                      {data.marketBenchmark.variancePercentage > 0 ? `+${data.marketBenchmark.variancePercentage}%` : `${data.marketBenchmark.variancePercentage}%`}
                    </strong>
                  </div>
                </div>

                {data.marketBenchmark.potentialAnnualSavings > 0 && (
                  <div
                    style={{
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      padding: "10px 14px",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", color: "#a7f3d0" }}>Potential Annual Recovery:</span>
                    <strong style={{ fontSize: "1rem", color: "#34d399" }}>
                      ~${data.marketBenchmark.potentialAnnualSavings.toLocaleString()}/yr
                    </strong>
                  </div>
                )}
              </div>

              {/* Section 4: CFO Guidance & Actions */}
              <div
                style={{
                  background: "rgba(30, 41, 59, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "18px",
                }}
              >
                <strong style={{ fontSize: "0.9rem", color: "#f8fafc", display: "block", marginBottom: 12 }}>
                  Executive Guidance & Action Deck
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.guidance.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(15, 23, 42, 0.5)",
                        padding: 10,
                        borderRadius: 8,
                        fontSize: "0.8rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <strong style={{ color: "#60a5fa" }}>{item.title}</strong>
                      <span style={{ color: "#cbd5e1" }}>{item.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
