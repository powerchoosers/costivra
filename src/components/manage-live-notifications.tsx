"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import {
  WorkspaceNotificationCenter,
  type WorkspaceNotification,
} from "@/components/ui/workspace-primitives";
import { safeManageNotificationHref } from "@/lib/manage/notifications";
import { createClient } from "@/lib/supabase/client";

type LiveNotification = {
  action_href?: string | null;
  body?: string | null;
  created_at?: string | null;
  id?: string | null;
  title?: string | null;
};

type NotificationPayload = {
  actionHref?: string | null;
  body?: string | null;
  createdAt?: string | null;
  id?: string | null;
  readAt?: string | null;
  title?: string | null;
};

const fallbackPollIntervalMs = 30_000;

function toNotification(value: NotificationPayload): WorkspaceNotification | null {
  if (
    typeof value.id !== "string"
    || typeof value.title !== "string"
    || typeof value.body !== "string"
    || typeof value.createdAt !== "string"
  ) {
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    body: value.body,
    createdAt: value.createdAt,
    readAt: typeof value.readAt === "string" ? value.readAt : null,
    href: safeManageNotificationHref(value.actionHref),
  };
}

function toRealtimeNotification(value: LiveNotification): WorkspaceNotification | null {
  return toNotification({
    id: value.id,
    title: value.title,
    body: value.body,
    createdAt: value.created_at,
    readAt: null,
    actionHref: value.action_href,
  });
}

function mergeNotifications(
  current: WorkspaceNotification[],
  incoming: WorkspaceNotification[],
) {
  const notifications = new Map(current.map((notification) => [notification.id, notification]));
  for (const notification of incoming) {
    const currentNotification = notifications.get(notification.id);
    notifications.set(notification.id, {
      ...currentNotification,
      ...notification,
      readAt: notification.readAt ?? currentNotification?.readAt ?? null,
    });
  }
  return Array.from(notifications.values())
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 20);
}

function playNotificationChime(context: AudioContext) {
  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
  gain.connect(context.destination);

  for (const [frequency, delay] of [[523.25, 0], [659.25, 0.105]] as const) {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now + delay);
    oscillator.connect(gain);
    oscillator.start(now + delay);
    oscillator.stop(now + delay + 0.34);
  }
}

/**
 * Manage owns its internal-alert data source. The bell, popover, interaction
 * treatment, and motion come from the same workspace primitive as /app.
 */
export function ManageNotificationCenter({
  soundEnabled,
}: {
  soundEnabled: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const active = useRef(true);
  const running = useRef(false);
  const initialized = useRef(false);
  const seen = useRef(new Set<string>());
  const audioContext = useRef<AudioContext | null>(null);

  const announceNewNotifications = useCallback((incoming: WorkspaceNotification[]) => {
    const fresh = incoming.filter((notification) => {
      if (seen.current.has(notification.id)) return false;
      seen.current.add(notification.id);
      return true;
    });
    if (!fresh.length || !initialized.current) return;

    for (const notification of fresh.slice(0, 4)) {
      toast.show({
        title: notification.title,
        message: notification.body,
        tone: "info",
        duration: 7_000,
        actionHref: notification.href ?? undefined,
        actionLabel: notification.href ? "View" : undefined,
      });
    }
    if (soundEnabled && audioContext.current?.state === "running") {
      playNotificationChime(audioContext.current);
    }
  }, [soundEnabled, toast]);

  const loadNotifications = useCallback(async () => {
    if (!active.current || running.current || document.visibilityState === "hidden") return;
    running.current = true;
    try {
      const response = await fetch("/api/manage/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Notifications could not be loaded.");
      const payload = (await response.json()) as { notifications?: NotificationPayload[] };
      const incoming = (payload.notifications ?? [])
        .map(toNotification)
        .filter((notification): notification is WorkspaceNotification => notification !== null);

      announceNewNotifications(incoming);
      setNotifications((current) => {
        const optimisticReadDates = new Map(
          current
            .filter((notification) => notification.readAt)
            .map((notification) => [notification.id, notification.readAt]),
        );
        return incoming.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? optimisticReadDates.get(notification.id) ?? null,
        }));
      });
      initialized.current = true;
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      running.current = false;
      setLoading(false);
    }
  }, [announceNewNotifications]);

  const markRead = useCallback(async (ids?: string[], all = false) => {
    try {
      const response = await fetch("/api/manage/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { ids }),
      });
      if (!response.ok) throw new Error("Notifications could not be updated.");

      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => (
        all || ids?.includes(notification.id)
          ? { ...notification, readAt }
          : notification
      )));
      return true;
    } catch (error) {
      toast.error(
        "That didn’t work",
        error instanceof Error ? error.message : "Please try again.",
      );
      return false;
    }
  }, [toast]);

  const selectNotification = useCallback(async (notification: WorkspaceNotification) => {
    if (!notification.readAt) await markRead([notification.id]);
    if (!notification.href) return;
    setOpen(false);
    router.push(notification.href);
  }, [markRead, router]);

  const markAllRead = useCallback(async () => {
    if (await markRead(undefined, true)) setOpen(false);
  }, [markRead]);

  useEffect(() => {
    const unlockAudio = () => {
      if (!soundEnabled || !window.AudioContext) return;
      if (!audioContext.current) audioContext.current = new window.AudioContext();
      if (audioContext.current.state === "suspended") void audioContext.current.resume();
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [soundEnabled]);

  useEffect(() => {
    active.current = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!active.current || !userId) return;
      channel = supabase
        .channel(`internal-notifications:${userId}:${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "internal_notifications",
            filter: `recipient_user_id=eq.${userId}`,
          },
          (payload) => {
            const notification = toRealtimeNotification(payload.new as LiveNotification);
            if (!notification) return;
            announceNewNotifications([notification]);
            setNotifications((current) => mergeNotifications(current, [notification]));
          },
        )
        .subscribe();
    }

    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    void subscribe();
    const timer = window.setInterval(() => void loadNotifications(), fallbackPollIntervalMs);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadNotifications();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active.current = false;
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [announceNewNotifications, loadNotifications]);

  useEffect(() => () => {
    void audioContext.current?.close();
  }, []);

  return (
    <WorkspaceNotificationCenter
      emptyCopy={loadError ? "Notifications could not be loaded. Try again shortly." : undefined}
      loading={loading}
      notifications={notifications}
      onMarkAllRead={markAllRead}
      onNotificationSelect={selectNotification}
      onOpenChange={setOpen}
      open={open}
    />
  );
}
