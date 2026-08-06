"use client";

import { FileText, Gauge, LayoutDashboard, RadioTower, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_FINDING, DEMO_STAGES, type DemoStageId } from "./demo-data";
import { DemoApprovalState, type DemoApprovalDecision } from "./demo-approval-state";
import { DemoVerificationState } from "./demo-verification-state";
import { SourceEvidenceDrawer } from "./source-evidence-drawer";
import { CostivraMark } from "@/components/brand";

const stageHints: Record<DemoStageId, string> = {
  source: "The source is preserved before a finding is proposed.",
  change: "A deterministic comparison isolates the recurring change.",
  evidence: "The source line, extracted fact, and calculation stay together.",
  approval: "No outside action happens until an authorized person approves it.",
  result: "A later record is needed before a result can be called verified.",
};

export function OpportunityDemo() {
  const [stage, setStage] = useState<DemoStageId>("source");
  const [manualSelection, setManualSelection] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [decision, setDecision] = useState<DemoApprovalDecision>("pending");
  const sourceTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (manualSelection || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setStage((current) => {
        const index = DEMO_STAGES.findIndex((item) => item.id === current);
        return DEMO_STAGES[(index + 1) % DEMO_STAGES.length].id;
      });
    }, 4200);
    return () => window.clearInterval(interval);
  }, [manualSelection]);

  const selectStage = (nextStage: DemoStageId) => {
    setManualSelection(true);
    setStage(nextStage);
  };

  const openApproval = () => {
    setManualSelection(true);
    setStage("approval");
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    window.requestAnimationFrame(() => sourceTriggerRef.current?.focus());
  }, []);

  const currentStage = DEMO_STAGES.find((item) => item.id === stage) ?? DEMO_STAGES[0];

  return (
    <div className="demo-product-wrap">
      <div className="product-frame" aria-label="Costivra interactive opportunity example">
        <div className="demo-preview-content" aria-hidden={drawerOpen || undefined}>
          <div className="preview-shell">
            <div className="preview-sidebar" aria-hidden="true">
              <span className="mini-mark"><CostivraMark size={20} /></span>
              <LayoutDashboard size={17} /><FileText size={17} /><Gauge size={17} /><ShieldCheck size={17} />
            </div>
            <div className="preview-main">
              <div className="frame-top">
                <div className="frame-org">Interactive example</div>
                <span className="eyebrow">Synthetic data</span>
              </div>
              <div className="demo-stage-region" aria-label="Demo stages">
                <div className="demo-stage-list" role="list">
                  {DEMO_STAGES.map((item) => (
                    <button
                      className={`demo-stage-button${item.id === stage ? " is-active" : ""}`}
                      key={item.id}
                      type="button"
                      aria-label={`Stage ${item.number}: ${item.label}`}
                      aria-pressed={item.id === stage}
                      onClick={() => selectStage(item.id)}
                    >
                      <span>{item.number}</span><strong>{item.label}</strong>
                    </button>
                  ))}
                </div>
                <div className="demo-stage-summary" aria-live="polite">
                  <span>{currentStage.number}</span>
                  <div><strong>{currentStage.title}</strong><small>{currentStage.description}</small></div>
                  <span className="demo-stage-status">{manualSelection ? "Selected" : "Auto"}</span>
                </div>
              </div>

              {stage === "approval" ? (
                <DemoApprovalState decision={decision} onDecision={setDecision} />
              ) : stage === "result" ? (
                <DemoVerificationState />
              ) : (
                <>
                  <div className="frame-body">
                    <div className="opportunity-preview">
                      <div className="opportunity-head">
                        <span className="icon-well"><RadioTower aria-hidden="true" size={23} /></span>
                        <div><h3>Telecom bill increase</h3><span className="muted">{stageHints[stage]}</span></div>
                      </div>
                      <div className="fact-grid">
                        <div className="fact"><span>Potential annual value</span><strong className="value">{DEMO_FINDING.potentialAnnualValue}</strong></div>
                        <div className="fact"><span>Confidence</span><strong>{DEMO_FINDING.confidence}</strong></div>
                        <div className="fact"><span>Renewal window</span><strong>{DEMO_FINDING.renewalWindow}</strong></div>
                        <div className="fact"><span>Evidence</span><strong>1 source</strong></div>
                      </div>
                    </div>
                    <div className="evidence-preview">
                      <span className="eyebrow">Source document</span>
                      <div className="document-sheet">
                        <div className="demo-document-heading"><strong>Business internet</strong><span>{DEMO_FINDING.sourcePage}</span></div>
                        <div className="doc-line short" /><div className="doc-line" /><div className="doc-line blue" /><div className="doc-line" />
                        <div className="demo-document-total"><span>Total</span><strong>{DEMO_FINDING.currentMonthlyCharge}</strong></div>
                      </div>
                      <button ref={sourceTriggerRef} className="button button-quiet" type="button" aria-haspopup="dialog" onClick={() => setDrawerOpen(true)}>View source <FileText aria-hidden="true" size={16} /></button>
                    </div>
                  </div>
                  <div className="approval-bar">
                    <div><strong>{stage === "evidence" ? "Evidence ready for review" : "Requires approval"}</strong><div className="muted" style={{ fontSize: ".78rem", marginTop: 4 }}>{stageHints[stage]}</div></div>
                    <button className="button button-primary" type="button" onClick={openApproval}>Review opportunity</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {drawerOpen ? <SourceEvidenceDrawer triggerRef={sourceTriggerRef} onClose={closeDrawer} /> : null}
    </div>
  );
}
