import { ArrowRight, Check, X } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";
import { DEMO_FINDING, DEMO_SOURCE_LINES } from "./demo-data";

export function SourceEvidenceDrawer({
  triggerRef,
  onClose,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const trigger = triggerRef.current;
    closeRef.current?.focus();

    const focusables = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((node) => !node.hasAttribute("disabled"));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusables();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      (trigger ?? previous)?.focus();
    };
  }, [onClose, triggerRef]);

  return (
    <div className="demo-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside ref={dialogRef} className="demo-source-drawer" role="dialog" aria-modal="true" aria-labelledby="demo-source-title">
        <header className="demo-drawer-header">
          <div><span className="demo-state-kicker">Illustrative source evidence</span><h2 id="demo-source-title">Why this finding exists</h2></div>
          <button ref={closeRef} className="demo-drawer-close" type="button" aria-label="Close source evidence" onClick={onClose}><X aria-hidden="true" size={18} /></button>
        </header>
        <div className="demo-drawer-body">
          <p className="demo-drawer-note">Synthetic demonstration data · no customer document is shown here.</p>
          <div className="demo-source-document" aria-label="Synthetic telecom bill excerpt">
            <div className="demo-source-document-top"><strong>{DEMO_FINDING.vendor}</strong><span>{DEMO_FINDING.documentName}</span></div>
            <div className="demo-source-document-meta"><span>Account: ILLUSTRATIVE-4821</span><span>Page 3 of 4</span></div>
            <div className="demo-source-lines">
              {DEMO_SOURCE_LINES.map((line) => <div className={`demo-source-line${line.highlighted ? " is-highlighted" : ""}`} key={line.label}><span>{line.label}</span><strong>{line.value}</strong></div>)}
            </div>
            <div className="demo-source-highlight"><Check aria-hidden="true" size={15} /><span>Highlighted source line: annual service adjustment</span></div>
          </div>
          <div className="demo-evidence-detail">
            <div><span>Extracted fact</span><strong>{DEMO_FINDING.monthlyChange} recurring change</strong></div>
            <div><span>Evidence reference</span><strong>{DEMO_FINDING.evidenceReference} · {DEMO_FINDING.sourcePage}</strong></div>
            <div><span>Confidence</span><strong>{DEMO_FINDING.confidence} · reviewable</strong></div>
            <div><span>Calculation inputs</span><strong>{DEMO_FINDING.calculation}</strong></div>
          </div>
          <p className="demo-drawer-footer">Costivra links the claim to the source, shows the calculation, and keeps uncertainty visible.</p>
          <button className="button button-secondary demo-drawer-dismiss" type="button" onClick={onClose}>Return to example <ArrowRight aria-hidden="true" size={16} /></button>
        </div>
      </aside>
    </div>
  );
}
