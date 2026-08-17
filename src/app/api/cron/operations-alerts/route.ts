import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { deliverOperationsAlert } from "@/lib/email/operations-alert";
import { getRequestId, withRequestId } from "@/lib/observability/request-context";
import {
  collectSystemOperationalSignals,
  getActiveOperationalAlerts,
} from "@/lib/observability/operational-alerts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const respond = (body: unknown, init?: ResponseInit) =>
    withRequestId(NextResponse.json(body, init), requestId);

  if (!isCronAuthorized(request)) {
    return respond({ error: "Unauthorized." }, { status: 401 });
  }

  const db = createServerSupabaseClient();

  try {
    const { activeSignals, resolvedKeys } = await collectSystemOperationalSignals(db);
    const activeAlerts = await getActiveOperationalAlerts(db);
    const minimumSeverity = process.env.COSTIVRA_ALERT_MIN_SEVERITY === "critical" ? "critical" : "warning";
    const severityRank = (severity: string) => severity === "critical" ? 2 : severity === "warning" ? 1 : 0;
    const deliveries = await Promise.all(
      activeAlerts
        .filter((alert) => severityRank(alert.severity) >= severityRank(minimumSeverity))
        .map(async (alert) => ({ signalKey: alert.signalKey, result: await deliverOperationsAlert(db, alert) })),
    );

    return respond({
      ok: true,
      evaluatedAt: new Date().toISOString(),
      activeSignalsCount: activeSignals.length,
      resolvedKeysCount: resolvedKeys.length,
      totalActiveAlerts: activeAlerts.length,
      deliveries,
      activeAlerts: activeAlerts.map((a) => ({
        signalKey: a.signalKey,
        severity: a.severity,
        category: a.category,
        title: a.title,
        occurrences: a.occurrenceCount,
        firstSeenAt: a.firstSeenAt,
        lastSeenAt: a.lastSeenAt,
      })),
    });
  } catch (caught: unknown) {
    const message = caught instanceof Error ? caught.message : "Operational alert evaluation failed.";
    return respond({ error: message }, { status: 500 });
  }
}
