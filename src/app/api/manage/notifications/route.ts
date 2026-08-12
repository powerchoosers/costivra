import { NextResponse } from "next/server";
import {
  INTERNAL_NOTIFICATION_LIMIT,
  recentInternalNotificationCutoff,
  safeManageNotificationHref,
} from "@/lib/manage/notifications";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function notificationVisibilityFilter(userId: string) {
  return `recipient_user_id.is.null,recipient_user_id.eq.${userId}`;
}

export async function GET() {
  try {
    const { db, userId } = await requireInternalOperator();
    const cutoff = recentInternalNotificationCutoff();
    const { data: notifications, error } = await db
      .from("internal_notifications")
      .select("id,title,body,action_href,created_at")
      .or(notificationVisibilityFilter(userId))
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(INTERNAL_NOTIFICATION_LIMIT);
    if (error) throw error;

    const notificationIds = (notifications ?? []).map((notification) => notification.id);
    let reads: Array<{ notification_id: string; read_at: string | null }> = [];
    if (notificationIds.length) {
      const { data, error: readsError } = await db
        .from("internal_notification_reads")
        .select("notification_id,read_at")
        .eq("user_id", userId)
        .in("notification_id", notificationIds);
      if (readsError) throw readsError;
      reads = data ?? [];
    }

    const readAtByNotificationId = new Map(
      reads.map((read) => [read.notification_id, read.read_at]),
    );
    return NextResponse.json({
      notifications: (notifications ?? []).map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        actionHref: safeManageNotificationHref(notification.action_href),
        createdAt: notification.created_at,
        readAt: readAtByNotificationId.get(notification.id) ?? null,
      })),
    });
  } catch (error) {
    const failure = manageApiError(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function PATCH(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = (await request.json()) as { all?: unknown; ids?: unknown };
    const all = body.all === true;
    const requestedIds = Array.isArray(body.ids)
      ? body.ids
          .filter((id): id is string => typeof id === "string" && uuidPattern.test(id))
          .slice(0, INTERNAL_NOTIFICATION_LIMIT)
      : [];

    if (!all && !requestedIds.length) {
      return NextResponse.json({ error: "Choose a valid notification." }, { status: 400 });
    }

    let visibleNotificationQuery = db
      .from("internal_notifications")
      .select("id")
      .or(notificationVisibilityFilter(userId))
      .gte("created_at", recentInternalNotificationCutoff());

    if (all) {
      visibleNotificationQuery = visibleNotificationQuery
        .order("created_at", { ascending: false })
        .limit(INTERNAL_NOTIFICATION_LIMIT);
    } else {
      visibleNotificationQuery = visibleNotificationQuery.in("id", requestedIds);
    }

    const { data: visibleNotifications, error: visibilityError } = await visibleNotificationQuery;
    if (visibilityError) throw visibilityError;
    const visibleIds = (visibleNotifications ?? []).map((notification) => notification.id);

    if (!all && visibleIds.length !== requestedIds.length) {
      return NextResponse.json(
        { error: "One or more notifications are no longer available." },
        { status: 404 },
      );
    }

    if (!visibleIds.length) return NextResponse.json({ ok: true, ids: [] });

    const { error } = await db.from("internal_notification_reads").upsert(
      visibleIds.map((notificationId) => ({
        notification_id: notificationId,
        user_id: userId,
        read_at: new Date().toISOString(),
      })),
      { onConflict: "notification_id,user_id" },
    );
    if (error) throw error;
    return NextResponse.json({ ok: true, ids: visibleIds });
  } catch (error) {
    const failure = manageApiError(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
