"use client";

import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "warning" | "info";
type ToastInput = {
  title: string;
  message?: string;
  tone?: ToastTone;
  duration?: number;
  actionHref?: string;
  actionLabel?: string;
  onActionClick?: () => void;
};
type ToastItem = Required<Pick<ToastInput, "title" | "tone">> &
  Pick<ToastInput, "message" | "actionHref" | "actionLabel" | "onActionClick"> & {
    id: number;
    leaving: boolean;
  };
type ToastContextValue = {
  show: (input: ToastInput) => number;
  success: (title: string, message?: string) => number;
  error: (title: string, message?: string) => number;
  warning: (title: string, message?: string) => number;
  info: (title: string, message?: string) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const icons = { success: CheckCircle2, error: CircleAlert, warning: TriangleAlert, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    const removalTimer = window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
      timers.current.delete(id);
    }, 180);
    timers.current.set(id, removalTimer);
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = ++nextId.current;
      const tone = input.tone ?? "info";
      setItems((current) => [
        ...current.slice(-3),
        {
          id,
          title: input.title,
          message: input.message,
          tone,
          actionHref: input.actionHref,
          actionLabel: input.actionLabel,
          onActionClick: input.onActionClick,
          leaving: false,
        },
      ]);
      const timer = window.setTimeout(() => dismiss(id), input.duration ?? (tone === "error" ? 6500 : 4200));
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      dismiss,
      success: (title, message) => show({ title, message, tone: "success" }),
      error: (title, message) => show({ title, message, tone: "error" }),
      warning: (title, message) => show({ title, message, tone: "warning" }),
      info: (title, message) => show({ title, message, tone: "info" }),
    }),
    [dismiss, show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-label="Notifications">
        {items.map((item) => {
          const Icon = icons[item.tone];
          return (
            <div
              className={`app-toast toast-${item.tone}${item.leaving ? " is-leaving" : ""}`}
              role={item.tone === "error" ? "alert" : "status"}
              key={item.id}
            >
              <Icon className="app-toast-icon" aria-hidden="true" size={18} />
              <div>
                <strong>{item.title}</strong>
                {item.message && <p>{item.message}</p>}
                {item.actionHref ? (
                  <Link className="app-toast-action" href={item.actionHref} onClick={() => dismiss(item.id)}>
                    {item.actionLabel || "Open"}
                  </Link>
                ) : item.onActionClick ? (
                  <button
                    type="button"
                    className="app-toast-action"
                    style={{
                      background: "none",
                      border: "none",
                      color: "inherit",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 600,
                      textDecoration: "underline",
                      display: "inline-block",
                      marginTop: 4,
                    }}
                    onClick={() => {
                      dismiss(item.id);
                      item.onActionClick?.();
                    }}
                  >
                    {item.actionLabel || "View Record"}
                  </button>
                ) : null}
              </div>
              <button type="button" onClick={() => dismiss(item.id)} aria-label={`Dismiss ${item.title}`}>
                <X aria-hidden="true" size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
