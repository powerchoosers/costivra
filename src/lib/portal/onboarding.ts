import type { PortalData } from "./types";
import { getActivationProgress } from "./activation";

export const ONBOARDING_STEPS = [
  "account_confirmed",
  "company_profile",
  "documents",
  "review",
  "monitoring",
  "complete",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export type OnboardingStatus = "not_started" | "in_progress" | "activated" | "blocked";
export type OnboardingSource = "pilot_invite" | "paid_checkout" | "internal";

export type OnboardingRecord = {
  organization_id: string;
  source: OnboardingSource;
  status: OnboardingStatus;
  current_step: OnboardingStep;
  company_completed_at: string | null;
  location_completed_at: string | null;
  documents_completed_at: string | null;
  review_completed_at: string | null;
  monitoring_selected_at: string | null;
  monitoring_completed_at: string | null;
  activated_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type OnboardingProjection = Pick<OnboardingRecord,
  "status" | "current_step" | "company_completed_at" | "location_completed_at" |
  "documents_completed_at" | "review_completed_at" | "monitoring_selected_at" |
  "monitoring_completed_at" | "activated_at" | "blocked_reason"
> & { progress: ReturnType<typeof getActivationProgress> };

export const ACTIVATION_REMINDER_MAX = 3;
export const ACTIVATION_REMINDER_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

export function shouldSendActivationReminder(input: {
  status: OnboardingStatus;
  createdAt: string;
  lastSentAt: string | null;
  reminderCount: number;
  now?: Date;
}) {
  if (!["not_started", "in_progress"].includes(input.status)) return false;
  if (input.reminderCount >= ACTIVATION_REMINDER_MAX) return false;
  const now = input.now ?? new Date();
  const createdAt = Date.parse(input.createdAt);
  if (!Number.isFinite(createdAt) || now.getTime() - createdAt < ACTIVATION_REMINDER_INTERVAL_MS) return false;
  if (!input.lastSentAt) return true;
  const lastSentAt = Date.parse(input.lastSentAt);
  return Number.isFinite(lastSentAt) && now.getTime() - lastSentAt >= ACTIVATION_REMINDER_INTERVAL_MS;
}

function firstIncomplete(progress: ReturnType<typeof getActivationProgress>): OnboardingStep {
  if (progress.locationCount < 1) return "company_profile";
  if (progress.documentCount < 3) return "documents";
  if (!progress.authoritativeReview) return "review";
  if (progress.monitoredCount < 1) return "monitoring";
  return "complete";
}

export function getOnboardingProgress(data: Pick<PortalData, "documents" | "locations" | "vendors" | "invoices" | "contracts">) {
  return getActivationProgress(data);
}

export function deriveOnboardingProjection(
  progress: ReturnType<typeof getActivationProgress>,
  existing: Pick<OnboardingRecord, "status" | "current_step" | "company_completed_at" | "location_completed_at" | "documents_completed_at" | "review_completed_at" | "monitoring_selected_at" | "monitoring_completed_at" | "activated_at" | "blocked_reason"> | null,
  now = new Date().toISOString(),
): OnboardingProjection {
  const locationDone = progress.locationCount > 0;
  const documentsDone = progress.documentCount >= 3;
  const reviewDone = progress.authoritativeReview;
  const monitoringDone = progress.monitoredCount > 0;
  const complete = locationDone && documentsDone && reviewDone && monitoringDone;

  if (existing?.status === "blocked") {
    return {
      status: "blocked",
      current_step: existing.current_step,
      company_completed_at: existing.company_completed_at,
      location_completed_at: existing.location_completed_at,
      documents_completed_at: existing.documents_completed_at,
      review_completed_at: existing.review_completed_at,
      monitoring_selected_at: existing.monitoring_selected_at,
      monitoring_completed_at: existing.monitoring_completed_at,
      activated_at: existing.activated_at,
      blocked_reason: existing.blocked_reason,
      progress,
    };
  }

  return {
    status: complete ? "activated" : (locationDone || documentsDone || reviewDone || monitoringDone ? "in_progress" : "not_started"),
    current_step: complete ? "complete" : firstIncomplete(progress),
    company_completed_at: existing?.company_completed_at ?? (locationDone ? now : null),
    location_completed_at: existing?.location_completed_at ?? (locationDone ? now : null),
    documents_completed_at: existing?.documents_completed_at ?? (documentsDone ? now : null),
    review_completed_at: existing?.review_completed_at ?? (reviewDone ? now : null),
    monitoring_selected_at: existing?.monitoring_selected_at ?? (monitoringDone ? now : null),
    monitoring_completed_at: existing?.monitoring_completed_at ?? (monitoringDone ? now : null),
    activated_at: existing?.activated_at ?? (complete ? now : null),
    blocked_reason: null,
    progress,
  };
}
