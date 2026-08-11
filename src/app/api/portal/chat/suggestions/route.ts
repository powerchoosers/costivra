import { NextResponse } from "next/server";
import { buildAssistantContext } from "@/lib/client-assistant/context-builder";
import { buildClientAssistantSuggestions } from "@/lib/client-assistant/suggestions";
import { apiError } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

/** Returns deterministic entry prompts from the caller's own workspace only. */
export async function GET() {
  try {
    const { db, organizationId } = await requirePortalContext();
    const context = await buildAssistantContext(db, organizationId);

    return NextResponse.json({
      suggestions: buildClientAssistantSuggestions(context),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return apiError(error);
  }
}
