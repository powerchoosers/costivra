"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

type LiveNotification = {
  id: string;
  title: string;
  body: string;
  action_href: string;
  created_at: string;
};

const pollIntervalMs = 3_000;

export function ManageLiveNotifications() {
  const router = useRouter();
  const toast = useToast();
  const active = useRef(true);
  const running = useRef(false);

  useEffect(() => {
    active.current = true;
    async function poll() {
      if (!active.current || running.current || document.visibilityState === "hidden") return;
      running.current = true;
      try {
        const response = await fetch("/api/manage/notifications", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          notifications?: LiveNotification[];
        };
        const notifications = (payload.notifications ?? []).slice(0, 4);
        if (!notifications.length) return;
        for (const notification of notifications) {
          toast.info(notification.title, notification.body);
        }
        await fetch("/api/manage/notifications", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: notifications.map(({ id }) => id) }),
        });
        router.refresh();
      } catch {
        // Keep polling. A temporary network failure should not interrupt owner work.
      } finally {
        running.current = false;
      }
    }

    void poll();
    const timer = window.setInterval(() => void poll(), pollIntervalMs);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router, toast]);

  return null;
}
