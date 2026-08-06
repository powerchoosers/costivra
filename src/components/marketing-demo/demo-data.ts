export type DemoStageId = "source" | "change" | "evidence" | "approval" | "result";

export type DemoStage = {
  id: DemoStageId;
  number: string;
  label: string;
  title: string;
  description: string;
};

export const DEMO_STAGES: readonly DemoStage[] = [
  { id: "source", number: "01", label: "Source received", title: "Source document received", description: "A synthetic telecom bill is ready for review." },
  { id: "change", number: "02", label: "Change detected", title: "Charge change detected", description: "A recurring rate moved outside the expected pattern." },
  { id: "evidence", number: "03", label: "Evidence linked", title: "Evidence linked", description: "The finding is tied to a source page and calculation." },
  { id: "approval", number: "04", label: "Approval required", title: "Approval required", description: "The proposed next step is waiting for the right owner." },
  { id: "result", number: "05", label: "Later result checked", title: "Later result checked", description: "An example later invoice shows what happened after approval." },
] as const;

export const DEMO_FINDING = {
  vendor: "Northstar Fiber — Illustrative",
  documentName: "Northstar_Fiber_May_2026.pdf",
  service: "Business internet · 100 Mbps dedicated line",
  potentialAnnualValue: "$12,480",
  monthlyChange: "$1,040 / mo",
  priorMonthlyCharge: "$2,100.00",
  currentMonthlyCharge: "$3,140.00",
  confidence: "92%",
  renewalWindow: "59 days",
  sourcePage: "Page 3 · rate schedule",
  evidenceReference: "EV-ILL-003",
  calculation: "$1,040 monthly change × 12 months = $12,480 potential annual value",
} as const;

export const DEMO_SOURCE_LINES = [
  { label: "Business internet service", value: "$2,100.00", highlighted: false },
  { label: "Annual service adjustment", value: "+$1,040.00", highlighted: true },
  { label: "Regulatory recovery fee", value: "$340.00", highlighted: false },
  { label: "Total due", value: "$3,480.00", highlighted: false },
] as const;
