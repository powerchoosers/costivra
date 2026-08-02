"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { createClient } from "@/lib/supabase/client";

type LiveNotification = {
  id: string;
  title: string;
  body: string;
  action_href: string;
  created_at: string;
};

const fallbackPollIntervalMs = 30_000;

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

export function ManageLiveNotifications({
  soundEnabled,
}: {
  soundEnabled: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const active = useRef(true);
  const running = useRef(false);
  const seen = useRef(new Set<string>());
  const audioContext = useRef<AudioContext | null>(null);

  const acknowledge = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await fetch("/api/manage/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  }, []);

  const showNotifications = useCallback((notifications: LiveNotification[]) => {
    const fresh = notifications.filter((notification) => {
      if (seen.current.has(notification.id)) return false;
      seen.current.add(notification.id);
      return true;
    });
    if (!fresh.length) return;
    for (const notification of fresh.slice(0, 4)) {
      toast.show({
        title: notification.title,
        message: notification.body,
        tone: "info",
        duration: 7_000,
        actionHref: notification.action_href,
        actionLabel: "View",
      });
    }
    if (soundEnabled && audioContext.current?.state === "running") {
      playNotificationChime(audioContext.current);
    }
    void acknowledge(fresh.map(({ id }) => id));
    router.refresh();
  }, [acknowledge, router, soundEnabled, toast]);

  useEffect(() => {
    const unlockAudio = () => {
      if (!soundEnabled) return;
      const AudioContextClass = window.AudioContext;
      if (!audioContext.current) audioContext.current = new AudioContextClass();
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

    async function poll() {
      if (!active.current || running.current || document.visibilityState === "hidden") return;
      running.current = true;
      try {
        const response = await fetch("/api/manage/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { notifications?: LiveNotification[] };
        showNotifications((payload.notifications ?? []).slice(0, 4));
      } catch {
        // Realtime reconnects automatically; polling is only the fallback.
      } finally {
        running.current = false;
      }
    }

    async function subscribe() {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!active.current || !userId) return;
      channel = supabase
        // A unique topic prevents React Strict Mode or hot reload from reusing a
        // channel that is still finishing its asynchronous unsubscribe.
        .channel(`internal-notifications:${userId}:${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "internal_notifications",
            filter: `recipient_user_id=eq.${userId}`,
          },
          (payload) => showNotifications([payload.new as LiveNotification]),
        )
        .subscribe();
    }

    void poll();
    void subscribe();
    const timer = window.setInterval(() => void poll(), fallbackPollIntervalMs);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [showNotifications]);

  useEffect(() => () => {
    void audioContext.current?.close();
  }, []);

  return null;
}
