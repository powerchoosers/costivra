import { NextResponse } from "next/server";
import { apiError } from "@/lib/portal/http";
import { getPortalData, requirePortalContext } from "@/lib/portal/repository";
import { createAccountingWorkbook } from "@/lib/portal/accounting-workbook";

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
    const generatedAt = new Date();
    const filenameDate = generatedAt.toISOString().slice(0, 10);
    const workbook = await createAccountingWorkbook(data, generatedAt);
    return new NextResponse(workbook, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="costivra-accounting-workbook-${filenameDate}.xlsx"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
