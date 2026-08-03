import { NextResponse } from "next/server";
import { getApolloCreditUsage, isApolloConfigured } from "@/lib/integrations/apollo";
import { manageApiError, requireInternalOwner } from "@/lib/manage/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    await requireInternalOwner();
    if (!isApolloConfigured())
      return NextResponse.json(
        {
          provider: "apollo",
          configured: false,
          connection: "unconfigured",
          checkedAt: new Date().toISOString(),
          leadCredits: null,
        },
        { headers: privateHeaders },
      );

    const usage = await getApolloCreditUsage();
    return NextResponse.json(
      {
        provider: "apollo",
        configured: true,
        connection:
          usage.status === "fresh"
            ? "connected"
            : usage.status === "forbidden"
              ? "needs_access"
              : "unavailable",
        checkedAt: usage.checkedAt,
        leadCredits: usage.leadCredits,
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
