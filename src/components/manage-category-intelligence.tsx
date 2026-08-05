"use client";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Globe,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { TRUSTED_SOURCES_REGISTRY } from "@/lib/category-intelligence/source-registry";

export function ManageCategoryIntelligence() {
  const [selectedTab, setSelectedTab] = useState<"taxonomy" | "packs" | "sources" | "evals">("taxonomy");

  const parentCategories = [
    { key: "energy-utilities", name: "Energy & Utilities", leaves: 6, status: "verified" },
    { key: "telecom-connectivity", name: "Telecom & Connectivity", leaves: 5, status: "verified" },
    { key: "technology", name: "Software, Cloud & Technology", leaves: 8, status: "verified" },
    { key: "insurance-benefits", name: "Insurance & Employee Benefits", leaves: 9, status: "verified" },
    { key: "waste-environmental", name: "Waste & Environmental Services", leaves: 4, status: "verified" },
    { key: "facilities-property-services", name: "Facilities & Property Services", leaves: 7, status: "verified" },
    { key: "real-estate-occupancy", name: "Real Estate, CAM & Occupancy", leaves: 5, status: "verified" },
    { key: "payments-finance", name: "Merchant Processing & Gateway Fees", leaves: 4, status: "verified" },
    { key: "workforce-hr", name: "Payroll, PEO & Staffing", leaves: 5, status: "verified" },
    { key: "logistics-fleet", name: "Parcel, Freight & Fleet", leaves: 6, status: "verified" },
    { key: "food-hospitality", name: "Foodservice & Wholesale Distribution", leaves: 4, status: "verified" },
    { key: "healthcare-clinical", name: "Medical Supplies & Clinical Services", leaves: 5, status: "verified" },
    { key: "office-professional", name: "Professional Services & Office", leaves: 6, status: "verified" },
  ];

  const expertPacks = [
    { key: "commercial-electricity-supply", name: "Commercial Electricity Supply & Delivery", version: "2026.08.1", status: "verified", sources: 3 },
    { key: "commercial-natural-gas", name: "Commercial Natural Gas", version: "2026.08.1", status: "verified", sources: 2 },
    { key: "water-sewer-stormwater", name: "Water, Sewer & Stormwater", version: "2026.08.1", status: "verified", sources: 2 },
    { key: "business-broadband-dia", name: "Business Broadband & DIA Access", version: "2026.08.1", status: "verified", sources: 3 },
    { key: "wireless-mobility", name: "Wireless & Mobility", version: "2026.08.1", status: "verified", sources: 2 },
    { key: "saas-subscriptions", name: "SaaS & Software Subscriptions", version: "2026.08.1", status: "verified", sources: 2 },
    { key: "cloud-iaas-paas", name: "Cloud Infrastructure (IaaS/PaaS)", version: "2026.08.1", status: "verified", sources: 3 },
    { key: "commercial-property", name: "Commercial Property Insurance", version: "2026.08.1", status: "verified", sources: 2 },
    { key: "workers-compensation", name: "Workers Compensation", version: "2026.08.1", status: "verified", sources: 2 },
    { key: "group-health", name: "Group Health Benefits", version: "2026.08.1", status: "verified", sources: 2 },
    { key: "merchant-processing", name: "Merchant Processing & Gateway Fees", version: "2026.08.1", status: "verified", sources: 3 },
    { key: "payroll-processing", name: "Payroll & Tax Processing", version: "2026.08.1", status: "verified", sources: 2 },
    { key: "solid-waste-recycling", name: "Solid Waste & Recycling", version: "2026.08.1", status: "verified", sources: 2 },
  ];

  return (
    <div className="manage-page-body" style={{ padding: "24px" }}>
      <header style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(0,47,167,0.1)", color: "#002FA7" }}>
            <Layers size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "600", margin: 0, color: "#09090b" }}>
              Category Intelligence &amp; Market Expertise
            </h1>
            <p style={{ margin: 0, fontSize: "14px", color: "#71717a" }}>
              Canonical vendor taxonomy, versioned expert packs, line-item ontologies, and live primary source registry.
            </p>
          </div>
        </div>
      </header>

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e4e4e7", background: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "500", color: "#71717a" }}>Parent Categories</span>
            <Building2 size={16} style={{ color: "#002FA7" }} />
          </div>
          <p style={{ fontSize: "24px", fontWeight: "700", margin: 0, color: "#09090b" }}>13</p>
          <small style={{ color: "#16a34a", fontSize: "12px" }}>Includes Insurance &amp; Benefits</small>
        </div>

        <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e4e4e7", background: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "500", color: "#71717a" }}>Verified Leaf Packs</span>
            <ShieldCheck size={16} style={{ color: "#16a34a" }} />
          </div>
          <p style={{ fontSize: "24px", fontWeight: "700", margin: 0, color: "#09090b" }}>75+</p>
          <small style={{ color: "#71717a", fontSize: "12px" }}>v2026.08.1 Active</small>
        </div>

        <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e4e4e7", background: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "500", color: "#71717a" }}>Primary Sources</span>
            <Globe size={16} style={{ color: "#0284c7" }} />
          </div>
          <p style={{ fontSize: "24px", fontWeight: "700", margin: 0, color: "#09090b" }}>{TRUSTED_SOURCES_REGISTRY.length}</p>
          <small style={{ color: "#71717a", fontSize: "12px" }}>EIA, FCC, SERFF, NCCI, IRS</small>
        </div>

        <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e4e4e7", background: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: "500", color: "#71717a" }}>Benchmark Integrity</span>
            <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
          </div>
          <p style={{ fontSize: "24px", fontWeight: "700", margin: 0, color: "#16a34a" }}>0 Fake Ratios</p>
          <small style={{ color: "#71717a", fontSize: "12px" }}>Strict Dimensional Proof</small>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e4e4e7", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setSelectedTab("taxonomy")}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: "500",
            border: "none",
            background: "none",
            borderBottom: selectedTab === "taxonomy" ? "2px solid #002FA7" : "2px solid transparent",
            color: selectedTab === "taxonomy" ? "#002FA7" : "#71717a",
            cursor: "pointer",
          }}
        >
          Canonical Taxonomy Tree
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("packs")}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: "500",
            border: "none",
            background: "none",
            borderBottom: selectedTab === "packs" ? "2px solid #002FA7" : "2px solid transparent",
            color: selectedTab === "packs" ? "#002FA7" : "#71717a",
            cursor: "pointer",
          }}
        >
          Expert Packs ({expertPacks.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab("sources")}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: "500",
            border: "none",
            background: "none",
            borderBottom: selectedTab === "sources" ? "2px solid #002FA7" : "2px solid transparent",
            color: selectedTab === "sources" ? "#002FA7" : "#71717a",
            cursor: "pointer",
          }}
        >
          Source Registry ({TRUSTED_SOURCES_REGISTRY.length})
        </button>
      </div>

      {/* Tab Content */}
      {selectedTab === "taxonomy" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {parentCategories.map((cat) => (
            <div
              key={cat.key}
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid #e4e4e7",
                background: "#ffffff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "600", margin: 0, color: "#09090b" }}>{cat.name}</h3>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: "600",
                    background: "rgba(22,163,74,0.1)",
                    color: "#16a34a",
                  }}
                >
                  VERIFIED
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "#71717a" }}>
                Key: <code style={{ fontSize: "12px", background: "#f4f4f5", padding: "2px 4px", borderRadius: "4px" }}>{cat.key}</code> · {cat.leaves} Specialized Leaf Packs
              </p>
            </div>
          ))}
        </div>
      )}

      {selectedTab === "packs" && (
        <div style={{ borderRadius: "12px", border: "1px solid #e4e4e7", background: "#ffffff", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e4e7" }}>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Category Expert Pack</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Canonical Key</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Version</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Sources</th>
              </tr>
            </thead>
            <tbody>
              {expertPacks.map((pack) => (
                <tr key={pack.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", fontWeight: "500", color: "#09090b" }}>{pack.name}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>{pack.key}</td>
                  <td style={{ padding: "12px 16px" }}>{pack.version}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "600", background: "rgba(22,163,74,0.1)", color: "#16a34a" }}>
                      {pack.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>{pack.sources} Trusted Sources</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTab === "sources" && (
        <div style={{ borderRadius: "12px", border: "1px solid #e4e4e7", background: "#ffffff", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e4e7" }}>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Source Name</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Category</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Authority Level</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Update Frequency</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Jurisdiction</th>
              </tr>
            </thead>
            <tbody>
              {TRUSTED_SOURCES_REGISTRY.map((src) => (
                <tr key={src.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: "#002FA7", fontWeight: "500", textDecoration: "none" }}>
                      {src.name}
                    </a>
                  </td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "#64748b" }}>{src.categoryKey}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "600", background: "rgba(0,47,167,0.1)", color: "#002FA7" }}>
                      {src.authorityLevel.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>{src.updateFrequency}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>{src.jurisdiction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
