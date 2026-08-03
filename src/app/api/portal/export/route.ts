import { NextResponse } from "next/server";
import { apiError } from "@/lib/portal/http";
import { getPortalData, requirePortalContext } from "@/lib/portal/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await requirePortalContext();
    if (!['owner', 'admin'].includes(context.role)) {
      return NextResponse.json(
        { error: "Administrator access is required." },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const data = await getPortalData();
    const generatedAt = new Date().toISOString();
    const filenameDate = generatedAt.slice(0, 10);
    const payload = {
      format: "costivra-workspace-export",
      version: 1,
      generatedAt,
      organizationId: context.organizationId,
      notice: "This export contains structured workspace records and file metadata. Original source-file bytes are not included.",
      data,
    };
    return new NextResponse(`${JSON.stringify(payload, null, 2)}\n`, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="costivra-workspace-${filenameDate}.json"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
