import { removePushSubscription, savePushSubscription } from "@/lib/push-actions";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/* ---------- Service worker ---------- */

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((e) => {
    console.warn("Service worker registration failed", e);
  });
}

/* ---------- Web Push ---------- */

export type PushSupport = "supported" | "needs-install" | "unsupported" | "not-configured";

export function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupport(): PushSupport {
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  if (!window.isSecureContext || !("serviceWorker" in navigator)) return "unsupported";
  if ("PushManager" in window && "Notification" in window) return "supported";
  // iOS only offers push to apps added to the home screen.
  return isIos() && !isStandalone() ? "needs-install" : "unsupported";
}

function applicationServerKey(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function currentPushSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** Asks for permission (must run from a click), subscribes, and saves it on the server. */
export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(VAPID_PUBLIC_KEY),
    }));
  const { ok } = await savePushSubscription(subscription.toJSON());
  if (!ok) {
    await subscription.unsubscribe();
    throw new Error("server rejected the subscription");
  }
  return permission;
}

export async function disablePush() {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  await removePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}

/* ---------- Install ("Add to Home Screen") ---------- */

type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Chrome/Edge fire this once, possibly before React has mounted, so it is
// captured at module load and shared through a tiny store.
let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own button instead of the mini-infobar
    deferredPrompt = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInstallPrompt() {
  return deferredPrompt;
}

export async function promptInstall() {
  const event = deferredPrompt;
  if (!event) return "dismissed";
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferredPrompt = null;
  emit();
  return outcome;
}
