import { ArrowRight, BadgeCheck, Check, ClipboardCheck, FileClock, FileSearch } from "lucide-react";
import Link from "next/link";
import { METHODOLOGY_PROOF, publicProofStageLabel, resolvePublicProof, type ApprovedPublicProof, type PublicProof } from "@/lib/public-proof";

const methodologySteps = [
  { title: "Finding identified", copy: "A source-backed change or risk is separated from the rest of the bill.", icon: FileSearch },
  { title: "Customer approves the method", copy: "The owner agrees what action and comparison will count before work begins.", icon: ClipboardCheck },
  { title: "Later evidence arrives", copy: "A later bill, credit, contract, or vendor record supplies the comparison.", icon: FileClock },
  { title: "Result is confirmed or rejected", copy: "The evidence either supports the result or keeps it unverified.", icon: BadgeCheck },
] as const;

export function PublicProofSection({ proof }: { proof?: PublicProof | null }) {
  const resolvedProof = resolvePublicProof(proof);

  return (
    <section className="public-proof-section" data-proof-mode={resolvedProof.kind} aria-labelledby="public-proof-title">
      <div className="container">
        {resolvedProof.kind === "approved_case" ? (
          <ApprovedCase proof={resolvedProof} />
        ) : (
          <MethodologyFallback />
        )}
      </div>
    </section>
  );
}

function MethodologyFallback() {
  return (
    <div className="public-proof-narrative">
      <div className="public-proof-intro">
        <span className="eyebrow">Value methodology · no approved public case yet</span>
        <h2 id="public-proof-title">{METHODOLOGY_PROOF.title}</h2>
        <p>{METHODOLOGY_PROOF.summary}</p>
        <Link className="public-proof-link" href="#evidence">See the evidence chain <ArrowRight aria-hidden="true" size={16} /></Link>
      </div>
      <div className="public-proof-status-rail" aria-label="Value status">
        <div className="public-proof-status public-proof-status--potential">
          <span>Potential</span>
          <strong>Finding identified</strong>
          <small>What the source and deterministic calculation suggest.</small>
        </div>
        <div className="public-proof-status public-proof-status--verified">
          <span>Verified</span>
          <strong>Not claimed yet</strong>
          <small>Requires later evidence and the approved method.</small>
        </div>
      </div>
      <ol className="public-proof-sequence">
        {methodologySteps.map(({ title, copy, icon: Icon }, index) => (
          <li key={title}>
            <span className="public-proof-step-number">{String(index + 1).padStart(2, "0")}</span>
            <Icon aria-hidden="true" size={19} />
            <div><strong>{title}</strong><p>{copy}</p></div>
            {index < methodologySteps.length - 1 ? <span className="public-proof-step-rule" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ApprovedCase({ proof }: { proof: ApprovedPublicProof }) {
  const stageLabel = publicProofStageLabel(proof.stage);

  return (
    <div className="public-proof-narrative public-proof-narrative--case">
      <div className="public-proof-intro">
        <span className="eyebrow">Approved public case · {proof.sourceLabel ?? "Customer evidence"}</span>
        <h2 id="public-proof-title">{proof.title}</h2>
        <p>{proof.summary}</p>
      </div>
      <div className="public-proof-case-status">
        <span>{stageLabel}</span>
        <strong>{proof.stage === "verified" ? "Verified outcome" : "Verified outcome not claimed"}</strong>
        <small>{proof.permissionReference ? `Permission reference: ${proof.permissionReference}` : "Public permission is required before this case can appear."}</small>
      </div>
      {proof.evidence?.length ? (
        <div className="public-proof-case-evidence">
          {proof.evidence.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.detail}</strong></div>)}
        </div>
      ) : null}
      {proof.metrics?.length ? (
        <dl className="public-proof-case-metrics">
          {proof.metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}
        </dl>
      ) : null}
      <p className="public-proof-disclosure"><Check aria-hidden="true" size={15} /> Public case content is shown only after explicit permission is recorded.</p>
    </div>
  );
}
