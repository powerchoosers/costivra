"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

const questions = [
  ["What does Costivra connect to?", "The first release supports secure document upload for recurring bills and contracts. Email, accounting, and vendor connections will be added through scoped integrations as each workflow is validated."],
  ["Does Costivra take action automatically?", "Not by default. Costivra prepares bounded actions and routes them through your approval policy. External emails, referrals, cancellations, vendor changes, and payment-related actions always require the appropriate authorization."],
  ["How are savings verified?", "Potential value and verified value are kept separate. Verification compares an approved baseline with post-action bills or credits, applies deterministic calculations, and records the evidence and assumptions."],
  ["What is the relationship with UCEP?", "UCEP is an optional energy-review partner. Costivra does not automatically send energy leads. Customers can export a review package to any advisor or explicitly consent to a disclosed UCEP referral."],
] as const;

export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="faq-list">
      {questions.map(([question, answer], index) => (
        <div className="faq-item" key={question}>
          <button className="faq-question" type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>
            {question}
            {open === index ? <Minus aria-hidden="true" size={18} /> : <Plus aria-hidden="true" size={18} />}
          </button>
          {open === index ? <div className="faq-answer">{answer}</div> : null}
        </div>
      ))}
    </div>
  );
}
