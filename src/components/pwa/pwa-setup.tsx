"use client";

import { useEffect } from "react";
import { savePushSubscription } from "@/lib/push-actions";
import { currentPushSubscription, pushSupport, registerServiceWorker } from "./pwa-client";

/** Registers the service worker (every page, so the app can be installed from the sign-in page too). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}

/**
 * If this browser already receives push, make sure it is linked to whoever is
 * signed in now (e.g. another person signed in on a shared computer).
 */
export function PushSync({ userId }: { userId: string }) {
  useEffect(() => {
    if (pushSupport() !== "supported" || Notification.permission !== "granted") return;
    currentPushSubscription()
      .then((subscription) => subscription && savePushSubscription(subscription.toJSON()))
      .catch(() => {});
  }, [userId]);
  return null;
}
