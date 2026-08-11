import { NextResponse } from "next/server";
import { getManageAssistantSessions } from "@/lib/manage/assistant-history";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";

export async function GET() {
  try {
    const { db, userId } = await requireInternalOperator();
    const sessions = await getManageAssistantSessions(db, userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    const response = manageApiError(error);
    return NextResponse.json({ error: response.error }, { status: response.status });
  }
}
