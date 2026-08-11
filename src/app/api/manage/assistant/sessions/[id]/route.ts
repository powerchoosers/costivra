import { NextResponse } from "next/server";
import {
  getManageAssistantMessages,
  getManageAssistantSession,
} from "@/lib/manage/assistant-history";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!uuidPattern.test(id))
      return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });

    const { db, userId } = await requireInternalOperator();
    const session = await getManageAssistantSession(db, userId, id);
    if (!session)
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    const messages = await getManageAssistantMessages(db, userId, id);
    return NextResponse.json({ session, messages });
  } catch (error) {
    const response = manageApiError(error);
    return NextResponse.json({ error: response.error }, { status: response.status });
  }
}
