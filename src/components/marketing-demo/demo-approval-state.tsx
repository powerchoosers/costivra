import { Check, CircleAlert, ShieldCheck, X } from "lucide-react";

export type DemoApprovalDecision = "pending" | "approved" | "declined";

export function DemoApprovalState({
  decision,
  onDecision,
}: {
  decision: DemoApprovalDecision;
  onDecision: (decision: Exclude<DemoApprovalDecision, "pending">) => void;
}) {
  return (
    <section className="demo-state-panel" aria-labelledby="demo-approval-title">
      <div className="demo-state-kicker"><ShieldCheck aria-hidden="true" size={15} /> Human authorization</div>
      <h3 id="demo-approval-title">Costivra has not acted yet.</h3>
      <p className="demo-state-lede">This illustrative action would ask the telecom vendor to explain the rate change. No message is sent from this demo.</p>
      <dl className="demo-state-facts">
        <div><dt>Proposed action</dt><dd>Prepare a vendor question</dd></div>
        <div><dt>Data involved</dt><dd>Rate schedule, bill page 3, and account reference</dd></div>
        <div><dt>Approver</dt><dd>Finance owner configured by your team</dd></div>
      </dl>
      {decision === "pending" ? (
        <div className="demo-approval-actions">
          <button className="button button-primary" type="button" onClick={() => onDecision("approved")}>Approve example <Check aria-hidden="true" size={16} /></button>
          <button className="button button-secondary" type="button" onClick={() => onDecision("declined")}>Decline example <X aria-hidden="true" size={16} /></button>
        </div>
      ) : (
        <div className={`demo-decision demo-decision--${decision}`} role="status">
          {decision === "approved" ? <Check aria-hidden="true" size={17} /> : <CircleAlert aria-hidden="true" size={17} />}
          <span>{decision === "approved" ? "Example action approved. It still has not been sent." : "Example action declined. No external action was taken."}</span>
        </div>
      )}
      <p className="demo-illustrative-note">Illustrative example · approval is always explicit</p>
    </section>
  );
}
