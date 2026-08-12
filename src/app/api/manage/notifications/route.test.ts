import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn(() => ({ status: 500, error: "Request failed" })));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { GET, PATCH } from "@/app/api/manage/notifications/route";

const ownNotificationId = "11111111-1111-4111-8111-111111111111";
const otherNotificationId = "22222222-2222-4222-8222-222222222222";

type QueryResult = { data: unknown; error: unknown };

function query(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    or: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

describe("manage notifications route", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset();
    manageApiError.mockClear();
  });

  it("returns recent read and unread notifications, newest first, scoped to the operator", async () => {
    const notificationsQuery = query({
      data: [
        {
          id: ownNotificationId,
          title: "New client reply",
          body: "Apex Logistics replied.",
          action_href: "/manage/accounts/account-1",
          created_at: "2026-08-12T12:00:00.000Z",
        },
      ],
      error: null,
    });
    const readsQuery = query({
      data: [{ notification_id: ownNotificationId, read_at: "2026-08-12T12:02:00.000Z" }],
      error: null,
    });
    const db = { from: vi.fn().mockReturnValueOnce(notificationsQuery).mockReturnValueOnce(readsQuery) };
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-id" });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      notifications: [{
        id: ownNotificationId,
        title: "New client reply",
        body: "Apex Logistics replied.",
        actionHref: "/manage/accounts/account-1",
        createdAt: "2026-08-12T12:00:00.000Z",
        readAt: "2026-08-12T12:02:00.000Z",
      }],
    });
    expect(notificationsQuery.or).toHaveBeenCalledWith(
      "recipient_user_id.is.null,recipient_user_id.eq.operator-id",
    );
    expect(notificationsQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(readsQuery.in).toHaveBeenCalledWith("notification_id", [ownNotificationId]);
  });

  it("rejects an attempt to mark another operator's notification as read", async () => {
    const visibleNotificationsQuery = query({ data: [], error: null });
    const upsert = vi.fn();
    const db = {
      from: vi.fn((table: string) => {
        if (table === "internal_notifications") return visibleNotificationsQuery;
        return { upsert };
      }),
    };
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-id" });

    const response = await PATCH(new Request("https://costivra.ai/api/manage/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [otherNotificationId] }),
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "One or more notifications are no longer available.",
    });
    expect(visibleNotificationsQuery.or).toHaveBeenCalledWith(
      "recipient_user_id.is.null,recipient_user_id.eq.operator-id",
    );
    expect(visibleNotificationsQuery.in).toHaveBeenCalledWith("id", [otherNotificationId]);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("marks only verified visible notifications as read", async () => {
    const visibleNotificationsQuery = query({ data: [{ id: ownNotificationId }], error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const db = {
      from: vi.fn((table: string) => {
        if (table === "internal_notifications") return visibleNotificationsQuery;
        return { upsert };
      }),
    };
    requireInternalOperator.mockResolvedValue({ db, userId: "operator-id" });

    const response = await PATCH(new Request("https://costivra.ai/api/manage/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [ownNotificationId] }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, ids: [ownNotificationId] });
    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({ notification_id: ownNotificationId, user_id: "operator-id" }),
    ], { onConflict: "notification_id,user_id" });
  });
});
