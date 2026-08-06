import { CircleCheck, Clock3, FileCheck2 } from "lucide-react";
import { DEMO_FINDING } from "./demo-data";

export function DemoVerificationState() {
  return (
    <section className="demo-state-panel" aria-labelledby="demo-result-title">
      <div className="demo-state-kicker"><FileCheck2 aria-hidden="true" size={15} /> Later evidence</div>
      <h3 id="demo-result-title">The example result is checked against a later bill.</h3>
      <p className="demo-state-lede">This is how Costivra keeps a potential finding separate from a confirmed outcome.</p>
      <div className="demo-result-rail" aria-label="Illustrative result timeline">
        <div className="demo-result-step"><span className="demo-result-icon"><CircleCheck aria-hidden="true" size={16} /></span><div><strong>Potential value</strong><small>{DEMO_FINDING.potentialAnnualValue}</small></div></div>
        <div className="demo-result-step"><span className="demo-result-icon"><Clock3 aria-hidden="true" size={16} /></span><div><strong>Work in progress</strong><small>Vendor explanation requested</small></div></div>
        <div className="demo-result-step"><span className="demo-result-icon"><FileCheck2 aria-hidden="true" size={16} /></span><div><strong>Example later check</strong><small>Changed charge appears on next bill</small></div></div>
      </div>
      <p className="demo-result-confirmation">Example later invoice confirms the changed charge. This demonstration does not represent a real customer result.</p>
      <p className="demo-illustrative-note">Illustrative example · potential value is not verified value</p>
    </section>
  );
}
