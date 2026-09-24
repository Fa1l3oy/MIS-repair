"use client";

import { MonitorDown, Share, Smartphone, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getInstallPrompt, isIos, isStandalone, promptInstall, subscribeInstallPrompt } from "./pwa-client";

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_EVENT = "pwa-install-dismissed";
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;

const noopSubscribe = () => () => {};

function subscribeDismissed(listener: () => void) {
  window.addEventListener(DISMISS_EVENT, listener);
  return () => window.removeEventListener(DISMISS_EVENT, listener);
}

function isDismissed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY)) < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // storage blocked: hidden until the next page load only
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

function useInstallPrompt() {
  return useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt, () => null);
}

/** Mobile card above the tab bar: one-tap install (Android) or how-to (iPhone). */
export function InstallBanner() {
  const prompt = useInstallPrompt();
  const iosBrowser = useSyncExternalStore(noopSubscribe, () => isIos() && !isStandalone(), () => false);
  const dismissed = useSyncExternalStore(subscribeDismissed, isDismissed, () => true);
  if (dismissed || (!prompt && !iosBrowser)) return null;

  return (
    <div className="animate-sheet-up fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl bg-white p-3.5 shadow-lift ring-1 ring-zinc-200/80 lg:hidden print:hidden">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Smartphone className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-zinc-900">ติดตั้งแอปแจ้งซ่อมบนมือถือ</p>
          {prompt ? (
            <p className="mt-0.5 text-zinc-500">เปิดได้จากหน้าจอโฮมเหมือนแอปทั่วไป และรับการแจ้งเตือนได้ทันที</p>
          ) : (
            <p className="mt-0.5 text-zinc-500">
              แตะ <Share className="inline size-4 align-[-3px] text-zinc-700" /> ด้านล่างของ Safari แล้วเลือก
              “เพิ่มไปยังหน้าจอโฮม”
            </p>
          )}
          {prompt && (
            <button type="button" onClick={() => promptInstall()} className="btn-primary mt-3 h-9 px-4 text-sm">
              ติดตั้งแอป
            </button>
          )}
        </div>
        <button type="button" onClick={dismiss} className="btn-icon -mt-1 -mr-1 size-8" aria-label="ปิด">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Sidebar row on desktop Chrome/Edge when the app can be installed. */
export function InstallAppButton() {
  const prompt = useInstallPrompt();
  if (!prompt) return null;
  return (
    <button
      type="button"
      onClick={() => promptInstall()}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
    >
      <MonitorDown className="size-[18px] shrink-0 text-zinc-400" strokeWidth={1.75} />
      ติดตั้งแอปบนเครื่องนี้
    </button>
  );
}
