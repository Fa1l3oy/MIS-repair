"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useRef, useState } from "react";

const POLL_MS = 30_000;
const CountContext = createContext(0);

/**
 * Polls the unread-notification count once for the whole shell (sidebar and
 * mobile tab bar both read it). When the count goes up the current page is
 * refreshed too, which brings new rows into lists such as the maintenance queue.
 */
export function NotificationCountProvider({ initialCount, children }: { initialCount: number; children: React.ReactNode }) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [prevInitial, setPrevInitial] = useState(initialCount);
  const last = useRef(initialCount);

  // Server re-renders (e.g. after marking as read) pass a fresh initialCount.
  if (initialCount !== prevInitial) {
    setPrevInitial(initialCount);
    setCount(initialCount);
  }
  useEffect(() => {
    last.current = initialCount;
  }, [initialCount]);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const { count: next } = (await res.json()) as { count: number };
        if (next > last.current) router.refresh();
        last.current = next;
        setCount(next);
      } catch {
        // Offline or server restarting — try again on the next tick.
      }
    }
    const timer = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [router]);

  // Unread count on the home-screen / taskbar icon of the installed app.
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    (count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge()).catch(() => {});
  }, [count]);

  return <CountContext value={count}>{children}</CountContext>;
}

export function useNotificationCount() {
  return use(CountContext);
}

export function NotificationCountBadge({ className = "" }: { className?: string }) {
  const count = useNotificationCount();
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white tabular-nums ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
