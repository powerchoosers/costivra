import type { MalwareScanResult } from "@/lib/security/malware-scanner";

export type ManualUploadScanDecision =
  | { action: "process" }
  | { action: "quarantine"; message: string }
  | { action: "reject"; message: string };

export function manualUploadScanDecision(
  scan: MalwareScanResult,
): ManualUploadScanDecision {
  if (scan.status === "clean") return { action: "process" };
  if (scan.status === "infected") {
    return {
      action: "reject",
      message: "The security scanner rejected this file. It was not stored or analyzed.",
    };
  }
  return {
    action: "quarantine",
    message:
      scan.detail ||
      "The security scan could not finish. The file is quarantined and has not been analyzed.",
  };
}
