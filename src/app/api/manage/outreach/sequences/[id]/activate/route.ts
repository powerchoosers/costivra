import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { getSequence } from "@/lib/manage/sequences/repository";
import { validateSequenceDraft } from "@/lib/manage/sequences/validation";
import { checkSystemReadiness } from "@/lib/manage/system-readiness";
import { cleanUuid } from "@/lib/portal/http";
import { checkSequenceReleaseReadiness } from "@/lib/manage/sequences/release-readiness";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid sequence." }, { status: 400 });
    if (process.env.COSTIVRA_SEQUENCE_EXECUTION_ENABLED !== "true") {
      return NextResponse.json({ error: "Sequence execution is not enabled for this release." }, { status: 409 });
    }

    const sequence = await getSequence(db, id);
    if (!sequence) return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    if (sequence.status !== "draft" && sequence.status !== "paused") {
      return NextResponse.json({ error: "Only draft or paused sequences can be activated." }, { status: 409 });
    }
    const validation = validateSequenceDraft(sequence, { forActivation: true });
    if (!validation.valid) {
      return NextResponse.json({ error: "This sequence needs attention before activation.", details: validation.errors }, { status: 409 });
    }

    const release = await checkSequenceReleaseReadiness(db);
    if (!release.ready) {
      return NextResponse.json({ error: "Sequence activation setup is incomplete. Apply the latest safety migration first.", missing: release.missing }, { status: 503 });
    }

    const readiness = await checkSystemReadiness(db, { runLiveMalwareProbe: false });
    const blockedServices = readiness.services
      .filter((service) => service.status === "blocked")
      .map((service) => ({ id: service.id, message: service.message }));
    if (readiness.overall === "blocked") {
      return NextResponse.json({
        error: "Sequence activation is blocked by current system readiness.",
        blockedServices,
      }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data: activation, error } = await db.rpc("activate_crm_sequence", {
      p_sequence_id: id,
      p_actor_id: userId,
      p_now: now,
    });
    if (error?.code === "42883") {
      return NextResponse.json({ error: "Sequence activation setup is incomplete. Apply the latest database migration first." }, { status: 503 });
    }
    if (error) throw error;
    const activated = Array.isArray(activation) ? activation[0] : activation;
    if (!activated) return NextResponse.json({ error: "The sequence changed before activation. Reload and try again." }, { status: 409 });
    return NextResponse.json({
      sequence: {
        id: activated.sequence_id,
        status: "active",
        execution_enabled: true,
        activated_at: activated.activated_at,
        activated_enrollments: activated.activated_enrollments,
      },
    });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
