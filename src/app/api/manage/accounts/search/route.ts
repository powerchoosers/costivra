import { NextResponse } from "next/server";
import {
  isApolloConfigured,
  searchApolloOrganizations,
} from "@/lib/integrations/apollo";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText } from "@/lib/portal/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireInternalOperator();
    const query = cleanText(new URL(request.url).searchParams.get("q"), 240);
    if (!query || query.length < 3)
      return NextResponse.json({ configured: isApolloConfigured(), results: [] });
    if (!isApolloConfigured())
      return NextResponse.json(
        { configured: false, results: [], error: "Apollo company search is not configured." },
        { status: 503 },
      );
    const result = await searchApolloOrganizations(query);
    if (result.status !== "fresh")
      return NextResponse.json(
        { configured: true, results: [], status: result.status, error: "Apollo could not complete the company search." },
        { status: result.status === "rate_limited" ? 429 : 503 },
      );
    return NextResponse.json({ configured: true, results: result.results });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
