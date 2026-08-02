import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSystemReadiness, type ReadinessService } from "@/lib/manage/system-readiness";
import type {
  PublicServiceState,
  PublicServiceStatus,
  PublicSystemStatus,
} from "@/lib/status/public-status-types";

function byId(services: ReadinessService[], id: ReadinessService["id"]) {
  return services.find((service) => service.id === id);
}

function overallState(services: PublicServiceStatus[]): PublicServiceState {
  if (services.some((service) => service.state === "outage")) return "outage";
  if (services.some((service) => service.state === "limited")) return "limited";
  return "operational";
}

export async function getPublicSystemStatus(db: SupabaseClient): Promise<PublicSystemStatus> {
  const readiness = await checkSystemReadiness(db, { includeOptionalServices: false });
  const database = byId(readiness.services, "database");
  const resend = byId(readiness.services, "resend");
  const worker = byId(readiness.services, "worker");
  const malware = byId(readiness.services, "malware");
  const openrouter = byId(readiness.services, "openrouter");

  const databaseUnavailable = !database || database.status === "blocked";
  const intakeUnavailable =
    databaseUnavailable ||
    !resend ||
    resend.status === "blocked" ||
    !worker ||
    worker.status === "blocked";
  const secureProcessingPaused = !malware || malware.status === "blocked";
  const extractionUnavailable = !openrouter || openrouter.status === "blocked";

  const services: PublicServiceStatus[] = [
    {
      id: "website",
      name: "Public website",
      state: "operational",
      message: "Marketing, account entry, and status pages are responding.",
    },
    {
      id: "workspace",
      name: "Customer workspace",
      state: databaseUnavailable ? "outage" : "operational",
      message: databaseUnavailable
        ? "Customer records are currently unavailable."
        : "Organization-scoped records and account access are available.",
    },
    {
      id: "intake",
      name: "Document intake",
      state: intakeUnavailable ? "outage" : secureProcessingPaused || database?.status === "warning" ? "limited" : "operational",
      message: intakeUnavailable
        ? "Email and document intake are temporarily unavailable."
        : secureProcessingPaused
          ? "Files are accepted into private quarantine; automatic processing is paused pending security scanning."
          : database?.status === "warning"
            ? "Intake is available, with queued work receiving operator attention."
            : "Email and workspace uploads are available for secure processing.",
    },
    {
      id: "extraction",
      name: "Document intelligence",
      state: extractionUnavailable ? "outage" : secureProcessingPaused ? "limited" : "operational",
      message: extractionUnavailable
        ? "Automated document extraction is temporarily unavailable."
        : secureProcessingPaused
          ? "Extraction is ready, but files remain quarantined until security scanning is available."
          : "Evidence-linked document extraction is available.",
    },
  ];
  const overall = overallState(services);
  return {
    checkedAt: readiness.checkedAt,
    overall,
    headline:
      overall === "operational"
        ? "All customer-facing systems are operational."
        : overall === "limited"
          ? "Core systems are available with limited document processing."
          : "One or more customer-facing systems are unavailable.",
    services,
  };
}
