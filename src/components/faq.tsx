"use client";

import { Plus } from "@/lib/icons";
import { useState } from "react";

const defaultQuestions = [
  ["What does Costivra connect to?", "The first release supports secure document upload for recurring bills and contracts. Email, accounting, and vendor connections will be added through scoped integrations as each workflow is validated."],
  ["Does Costivra take action automatically?", "Not by default. Costivra prepares bounded actions and routes them through your approval policy. External emails, referrals, cancellations, vendor changes, and payment-related actions always require the appropriate authorization."],
  ["How are savings verified?", "Potential value and verified value are kept separate. Verification compares an approved baseline with post-action bills or credits, applies deterministic calculations, and records the evidence and assumptions."],
  ["What is the relationship with UCEP?", "UCEP is an optional energy-review partner. Costivra does not automatically send energy leads. Customers can export a review package to any advisor or explicitly consent to a disclosed UCEP referral."],
] as const;

type FaqQuestion = readonly [question: string, answer: string];

export function Faq({
  questions = defaultQuestions,
  idPrefix = "faq-answer",
}: {
  questions?: readonly FaqQuestion[];
  idPrefix?: string;
}) {
  const [open, setOpen] = useState(0);

  return (
    <div className="faq-list">
      {questions.map(([question, answer], index) => (
        <div className={`faq-item${open === index ? " is-open" : ""}`} key={question}>
          <button
            className="faq-question"
            type="button"
            aria-expanded={open === index}
            aria-controls={`${idPrefix}-${index}`}
            onClick={() => setOpen(open === index ? -1 : index)}
          >
            {question}
            <span className="faq-toggle" aria-hidden="true"><Plus size={18} /></span>
          </button>
          <div className="faq-answer-wrap" id={`${idPrefix}-${index}`}>
            <div className="faq-answer">{answer}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
