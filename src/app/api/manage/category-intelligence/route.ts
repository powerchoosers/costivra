import { NextResponse } from "next/server";
import { manageApiError, requireInternalOwner } from "@/lib/manage/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const { db } = await requireInternalOwner();
    const [
      classificationBacklog,
      correctionBacklog,
      researchRuns,
      evaluationRuns,
      analysisRuns,
    ] = await Promise.all([
      db
        .from("invoice_line_item_classifications")
        .select("id", { count: "exact", head: true })
        .or("canonical_code.is.null,review_status.eq.needs_review"),
      db
        .from("category_feedback")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
      db
        .from("category_research_runs")
        .select("id, expires_at"),
      db
        .from("category_evaluation_runs")
        .select("suite, passed, data_classification, coverage_level, evaluated_at")
        .order("evaluated_at", { ascending: false }),
      db
        .from("category_analysis_runs")
        .select("id", { count: "exact", head: true }),
    ]);

    const firstError = [
      classificationBacklog.error,
      correctionBacklog.error,
      researchRuns.error,
      evaluationRuns.error,
      analysisRuns.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    const now = Date.now();
    const staleResearchSources = (researchRuns.data ?? []).filter((run) => {
      const expiresAt = Date.parse(run.expires_at);
      return !Number.isFinite(expiresAt) || expiresAt <= now;
    }).length;
    const latestEvaluations = new Map<string, unknown>();
    for (const run of evaluationRuns.data ?? []) {
      if (!latestEvaluations.has(run.suite)) latestEvaluations.set(run.suite, run);
    }

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        queues: {
          unmappedOrReviewRequiredLines: classificationBacklog.count ?? 0,
          pendingCorrections: correctionBacklog.count ?? 0,
          staleResearchRuns: staleResearchSources,
          persistedAnalysisRuns: analysisRuns.count ?? 0,
        },
        evaluations: Array.from(latestEvaluations.values()),
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: privateHeaders },
    );
  }
}
