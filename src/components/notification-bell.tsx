"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const POLL_MS = 30_000;

/**
 * Unread badge that polls the server, so technicians see new jobs without
 * reloading. When the count goes up the current page is refreshed too, which
 * brings new rows into lists such as the maintenance queue.
 */
export function NotificationBell({ initialCount }: { initialCount: number }) {
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

  return (
    <Link
      href="/notifications"
      className="relative flex h-10 w-10 items-center justify-center rounded-lg text-xl text-slate-600 hover:bg-slate-100"
      aria-label={count > 0 ? `การแจ้งเตือน ${count} รายการที่ยังไม่อ่าน` : "การแจ้งเตือน"}
      title="การแจ้งเตือน"
    >
      🔔
      {count > 0 && (
        <span className="absolute top-1 right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] leading-none font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
