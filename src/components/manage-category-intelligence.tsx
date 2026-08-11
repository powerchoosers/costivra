"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CircleDashed,
  Globe,
  Layers,
  ShieldCheck,
} from "@/lib/icons";
import { WorkspaceStatusBadge } from "@/components/ui/workspace-primitives";
import { TRUSTED_SOURCES_REGISTRY } from "@/lib/category-intelligence/source-registry";
import { getRegisteredExpertPacks } from "@/lib/category-intelligence/packs";

const parentCategories = [
  { key: "energy-utilities", name: "Energy & Utilities", leaves: 6 },
  { key: "telecom-connectivity", name: "Telecom & Connectivity", leaves: 5 },
  { key: "technology", name: "Technology & Digital Services", leaves: 7 },
  { key: "insurance-benefits", name: "Insurance & Employee Benefits", leaves: 9 },
  { key: "waste-environmental", name: "Waste & Environmental", leaves: 5 },
  { key: "facilities-property-services", name: "Facilities & Property Services", leaves: 10 },
  { key: "real-estate-occupancy", name: "Real Estate & Occupancy", leaves: 5 },
  { key: "payments-finance", name: "Payments, Banking & Finance", leaves: 5 },
  { key: "workforce-hr", name: "Workforce & HR", leaves: 6 },
  { key: "logistics-fleet", name: "Logistics, Shipping & Fleet", leaves: 8 },
  { key: "food-hospitality", name: "Food, Hospitality & Consumables", leaves: 5 },
  { key: "office-professional", name: "Office & Professional Services", leaves: 8 },
  { key: "healthcare-regulated", name: "Healthcare & Regulated Supplies", leaves: 6 },
  { key: "industrial-manufacturing", name: "Industrial & Manufacturing", leaves: 7 },
  { key: "taxes-permits-public-fees", name: "Taxes, Permits & Public Fees", leaves: 4 },
] as const;

const cardStyle = {
  padding: 16,
  borderRadius: "var(--workspace-panel-radius)",
  border: "1px solid var(--workspace-line)",
  background: "var(--workspace-surface)",
  color: "var(--workspace-ink)",
} as const;

function StatusBadge({ value }: { value: "draft" | "planned" }) {
  const isDraft = value === "draft";
  return (
    <WorkspaceStatusBadge
      style={{
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".04em",
        background: isDraft ? "rgba(245,158,11,.12)" : "#f4f4f5",
        color: isDraft ? "#a16207" : "#71717a",
      }}
    >
      {value.toUpperCase()}
    </WorkspaceStatusBadge>
  );
}

type CategoryOperations = {
  generatedAt: string;
  queues: {
    unmappedOrReviewRequiredLines: number;
    pendingCorrections: number;
    staleResearchRuns: number;
    persistedAnalysisRuns: number;
  };
  evaluations: Array<{
    suite: string;
    passed: boolean;
    data_classification: string;
    coverage_level: string;
    evaluated_at: string;
  }>;
};

export function ManageCategoryIntelligence() {
  const [selectedTab, setSelectedTab] = useState<
    "taxonomy" | "packs" | "sources"
  >("taxonomy");
  const expertPacks = useMemo(() => getRegisteredExpertPacks(), []);
  const coveredParents = useMemo(
    () => new Set(expertPacks.map((pack) => pack.parentKey)),
    [expertPacks],
  );
  const [operations, setOperations] = useState<CategoryOperations | null>(null);
  const [operationsError, setOperationsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/manage/category-intelligence", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as CategoryOperations | { error?: string };
        if (!response.ok) throw new Error("error" in payload ? payload.error : "Unable to load category operations.");
        return payload as CategoryOperations;
      })
      .then((payload) => {
        if (active) setOperations(payload);
      })
      .catch(() => {
        if (active) setOperationsError("Live review queues are unavailable right now.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="manage-page-body" style={{ padding: 24, color: "var(--workspace-ink)" }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 10,
              background: "rgba(0,47,167,.1)",
              color: "#002FA7",
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                color: "var(--workspace-ink)",
                fontSize: 22,
                fontWeight: 650,
              }}
            >
              Category Intelligence &amp; Market Expertise
            </h1>
            <p style={{ margin: "3px 0 0", color: "var(--workspace-muted)", fontSize: 14 }}>
              Internal quality controls for category rules, source reviews, and
              items that need a human check.
            </p>
          </div>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#71717a", fontSize: 13 }}>Parent categories</span>
            <Building2 size={16} color="#315bbb" />
          </div>
          <strong style={{ display: "block", marginTop: 8, fontSize: 24 }}>
            {parentCategories.length}
          </strong>
          <small style={{ color: "#71717a" }}>Canonical market map</small>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#71717a", fontSize: 13 }}>Dedicated packs</span>
            <CircleDashed size={16} color="#a16207" />
          </div>
          <strong style={{ display: "block", marginTop: 8, fontSize: 24 }}>
            {expertPacks.length}
          </strong>
          <small style={{ color: "#a16207" }}>Draft review, not verified</small>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#71717a", fontSize: 13 }}>Trusted sources</span>
            <Globe size={16} color="#0284c7" />
          </div>
          <strong style={{ display: "block", marginTop: 8, fontSize: 24 }}>
            {TRUSTED_SOURCES_REGISTRY.length}
          </strong>
          <small style={{ color: "#71717a" }}>Primary-source allowlist</small>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#71717a", fontSize: 13 }}>Benchmark policy</span>
            <ShieldCheck size={16} color="#138a62" />
          </div>
          <strong
            style={{
              display: "block",
              marginTop: 8,
              color: "#138a62",
              fontSize: 17,
            }}
          >
            No synthetic ranges
          </strong>
          <small style={{ color: "#71717a" }}>Quote or comparable required</small>
        </div>
      </div>

      <section aria-label="Live category operations" style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>Live review queue</h2>
            <p style={{ margin: "4px 0 0", color: "#71717a", fontSize: 12 }}>
              Owner-only operational counts. These are not customer-facing benchmark claims.
            </p>
          </div>
          {operations && <small style={{ color: "#71717a" }}>Updated {new Date(operations.generatedAt).toLocaleString()}</small>}
        </div>
        {operationsError ? (
          <p role="status" style={{ margin: 0, color: "#a16207", fontSize: 13 }}>{operationsError}</p>
        ) : !operations ? (
          <p role="status" style={{ margin: 0, color: "#71717a", fontSize: 13 }}>Loading review queues…</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
              {[
                ["Unmapped or review-required lines", operations.queues.unmappedOrReviewRequiredLines],
                ["Pending corrections", operations.queues.pendingCorrections],
                ["Stale research runs", operations.queues.staleResearchRuns],
                ["Persisted analysis runs", operations.queues.persistedAnalysisRuns],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ padding: 12, border: "1px solid #e4e4e7", borderRadius: 10 }}>
                  <strong style={{ display: "block", fontSize: 22 }}>{value}</strong>
                  <span style={{ color: "#71717a", fontSize: 12 }}>{label}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: "12px 0 0", color: "#71717a", fontSize: 12 }}>
              Latest evaluation evidence: {operations.evaluations.length === 0 ? "no persisted runs yet" : operations.evaluations.map((run) => `${run.suite} · ${run.passed ? "pass" : "fail"} · ${run.coverage_level}`).join(" | ")}.
            </p>
          </>
        )}
      </section>

      <div
        role="tablist"
        aria-label="Category intelligence views"
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 18,
          borderBottom: "1px solid #e4e4e7",
        }}
      >
        {(
          [
            ["taxonomy", "Taxonomy"],
            ["packs", `Expert packs (${expertPacks.length})`],
            ["sources", `Sources (${TRUSTED_SOURCES_REGISTRY.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            role="tab"
            aria-selected={selectedTab === key}
            key={key}
            onClick={() => setSelectedTab(key)}
            style={{
              padding: "10px 14px",
              border: 0,
              borderBottom:
                selectedTab === key
                  ? "2px solid #002FA7"
                  : "2px solid transparent",
              color: selectedTab === key ? "#002FA7" : "#71717a",
              background: "transparent",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {selectedTab === "taxonomy" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: 12,
          }}
        >
          {parentCategories.map((category) => {
            const covered = coveredParents.has(category.key);
            return (
              <article style={cardStyle} key={category.key}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 15 }}>{category.name}</h2>
                  <StatusBadge value={covered ? "draft" : "planned"} />
                </div>
                <p style={{ margin: "8px 0 0", color: "#71717a", fontSize: 12 }}>
                  <code>{category.key}</code> · {category.leaves} planned leaf markets
                </p>
              </article>
            );
          })}
        </div>
      )}

      {selectedTab === "packs" && (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e4e4e7",
            borderRadius: 12,
            background: "#fff",
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {[
                  "Expert pack",
                  "Canonical key",
                  "Version",
                  "Status",
                  "Ontology",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "11px 14px",
                      textAlign: "left",
                      borderBottom: "1px solid #e4e4e7",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expertPacks.map((pack) => (
                <tr key={pack.categoryKey}>
                  <td style={{ padding: "11px 14px", fontWeight: 600 }}>
                    {pack.displayName}
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      color: "#64748b",
                      fontFamily: "monospace",
                    }}
                  >
                    {pack.categoryKey}
                  </td>
                  <td style={{ padding: "11px 14px" }}>{pack.version}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <StatusBadge value="draft" />
                  </td>
                  <td style={{ padding: "11px 14px", color: "#64748b" }}>
                    {pack.lineItems.length} line-item definitions
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTab === "sources" && (
        <div style={{ display: "grid", gap: 10 }}>
          {TRUSTED_SOURCES_REGISTRY.map((source) => (
            <article style={cardStyle} key={source.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: 14 }}>
                    {source.name}
                  </strong>
                  <span style={{ color: "#71717a", fontSize: 12 }}>
                    {source.categoryKey} · {source.jurisdiction} · {source.updateFrequency}
                  </span>
                  <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 12 }}>
                    {source.restrictionNotes}
                  </p>
                </div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#315bbb", fontSize: 12, whiteSpace: "nowrap" }}
                >
                  Open source
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
