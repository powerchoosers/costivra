import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const { db, userId } = await requireInternalOperator();
    const [{ data: notifications, error }, { data: reads, error: readsError }] =
      await Promise.all([
        db
          .from("internal_notifications")
          .select("id,title,body,action_href,created_at")
          .gte(
            "created_at",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000).toISOString(),
          )
          .order("created_at", { ascending: true })
          .limit(20),
        db
          .from("internal_notification_reads")
          .select("notification_id")
          .eq("user_id", userId),
      ]);
    if (error) throw error;
    if (readsError) throw readsError;
    const readIds = new Set((reads ?? []).map((read) => read.notification_id));
    return NextResponse.json({
      notifications: (notifications ?? []).filter(
        (notification) => !readIds.has(notification.id),
      ),
    });
  } catch (error) {
    const failure = manageApiError(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function PATCH(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = (await request.json()) as { ids?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids
          .filter((id): id is string => typeof id === "string" && uuidPattern.test(id))
          .slice(0, 20)
      : [];
    if (!ids.length)
      return NextResponse.json({ error: "Choose a valid notification." }, { status: 400 });
    const { error } = await db.from("internal_notification_reads").upsert(
      ids.map((notificationId) => ({
        notification_id: notificationId,
        user_id: userId,
        read_at: new Date().toISOString(),
      })),
      { onConflict: "notification_id,user_id" },
    );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const failure = manageApiError(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
