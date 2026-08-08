import { ArrowRight, Check, FileClock, FileSearch } from "lucide-react";
import Link from "next/link";
import { METHODOLOGY_PROOF, publicProofStageLabel, resolvePublicProof, type ApprovedPublicProof, type PublicProof } from "@/lib/public-proof";

const methodologySteps = [
  { title: "We spot something to check", copy: "For example, a bill went up, a charge looks duplicated, or a service may no longer be needed.", icon: FileSearch },
  { title: "You choose what to do", copy: "Review it, ask the vendor a question, or leave it alone. Costivra does not make the decision for you.", icon: Check },
  { title: "The result is proved later", copy: "A lower bill or vendor credit is what turns a possible saving into a real one.", icon: FileClock },
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
        <span className="eyebrow">A simple promise</span>
        <h2 id="public-proof-title">{METHODOLOGY_PROOF.title}</h2>
        <p>{METHODOLOGY_PROOF.summary}</p>
        <Link className="public-proof-link" href="#evidence">See an example from a bill <ArrowRight aria-hidden="true" size={16} /></Link>
      </div>
      <div className="public-proof-status-rail" aria-label="Value status">
        <div className="public-proof-status public-proof-status--potential">
          <span>Possible savings</span>
          <strong>Something looks worth checking.</strong>
          <small>We show the charge and why it stood out. It is not money saved yet.</small>
        </div>
        <div className="public-proof-status public-proof-status--verified">
          <span>Real savings</span>
          <strong>A lower bill or credit proves it.</strong>
          <small>Only then do we count it as savings.</small>
        </div>
      </div>
      <div className="public-proof-example" aria-label="Example of possible and real savings">
        <div className="public-proof-example-label">Example</div>
        <p><strong>Your internet bill goes up by $200 a month.</strong> Costivra points it out and shows the bill.</p>
        <div className="public-proof-example-outcome"><span>Possible savings</span><strong>The increase is worth questioning.</strong></div>
        <div className="public-proof-example-outcome public-proof-example-outcome--verified"><span>Real savings</span><strong>Your provider lowers the bill or gives you a credit.</strong></div>
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
