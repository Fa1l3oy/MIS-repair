"use client";

import { BellRing, LoaderCircle, Send, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { sendTestPush } from "@/lib/push-actions";
import { Switch } from "../ui/switch";
import { currentPushSubscription, disablePush, enablePush, pushSupport, type PushSupport } from "./pwa-client";

type State = { support: PushSupport; permission: NotificationPermission | "unknown"; on: boolean };

/** "Notify me on this device" switch for the notifications page. */
export function PushToggle() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const support = pushSupport();
      const subscription = support === "supported" ? await currentPushSubscription().catch(() => null) : null;
      setState({
        support,
        permission: "Notification" in window ? Notification.permission : "unknown",
        on: Boolean(subscription) && Notification.permission === "granted",
      });
    })();
  }, []);

  if (!state || state.support === "not-configured") return null; // decided in the browser only

  async function toggle(next: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      if (next) {
        const permission = await enablePush();
        setState((s) => s && { ...s, permission, on: permission === "granted" });
        if (permission === "granted") setMessage({ tone: "ok", text: "เปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว" });
      } else {
        await disablePush();
        setState((s) => s && { ...s, on: false });
      }
    } catch {
      setMessage({ tone: "error", text: "เปิดการแจ้งเตือนไม่สำเร็จ เบราว์เซอร์นี้อาจไม่รองรับ ลองใช้ Chrome, Edge, Firefox หรือ Safari" });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    const { ok } = await sendTestPush().catch(() => ({ ok: false }));
    setBusy(false);
    setMessage(
      ok
        ? { tone: "ok", text: "ส่งแล้ว — การแจ้งเตือนทดสอบจะแสดงภายในไม่กี่วินาที" }
        : { tone: "error", text: "ส่งการแจ้งเตือนทดสอบไม่สำเร็จ" },
    );
  }

  const blocked = state.permission === "denied";
  const canToggle = state.support === "supported" && !blocked;

  return (
    <section className="card mb-5 p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <BellRing className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">การแจ้งเตือนบนอุปกรณ์นี้</h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                เด้งแจ้งเตือนทันทีแม้ไม่ได้เปิดแอปอยู่ เช่น มีงานใหม่ หรือสถานะงานของคุณเปลี่ยน
              </p>
            </div>
            {canToggle && (
              <div className="flex items-center gap-2 pt-0.5">
                {busy && <LoaderCircle className="size-4 animate-spin text-zinc-400" />}
                <Switch checked={state.on} onChange={toggle} disabled={busy} label="การแจ้งเตือนบนอุปกรณ์นี้" />
              </div>
            )}
          </div>

          {state.support === "needs-install" && (
            <p className="mt-3 rounded-xl bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-200/70">
              บน iPhone / iPad ต้องเพิ่มแอปลงหน้าจอโฮมก่อน: แตะ <Share className="inline size-4 align-[-3px]" /> แล้วเลือก
              “เพิ่มไปยังหน้าจอโฮม” จากนั้นเปิดแอปจากไอคอนและกลับมาเปิดสวิตช์นี้
            </p>
          )}
          {state.support === "unsupported" && (
            <p className="mt-3 text-sm text-zinc-500">
              เบราว์เซอร์หรือการเชื่อมต่อนี้ไม่รองรับการแจ้งเตือน (ต้องเปิดเว็บผ่าน HTTPS)
            </p>
          )}
          {blocked && state.support === "supported" && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 ring-1 ring-amber-600/20">
              การแจ้งเตือนถูกบล็อกไว้ — เปิดได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์ (ไอคอนหน้าแถบที่อยู่) แล้วโหลดหน้านี้ใหม่
            </p>
          )}
          {state.on && (
            <button
              type="button"
              onClick={test}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
            >
              <Send className="size-3.5" />
              ส่งการแจ้งเตือนทดสอบ
            </button>
          )}
          {message && (
            <p role="status" className={`mt-2 text-sm ${message.tone === "ok" ? "text-emerald-700" : "text-rose-600"}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
