import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

/** Web Push is optional: without a VAPID key pair the app only shows in-app notifications. */
export const pushEnabled = Boolean(PUBLIC_KEY && PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", PUBLIC_KEY!, PRIVATE_KEY!);
}

/**
 * Browsers' own push services. Subscriptions pointing anywhere else are
 * refused, otherwise the server could be made to POST to arbitrary URLs.
 */
const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge on Android, Samsung Internet, Opera
  "android.googleapis.com",
  "push.services.mozilla.com", // Firefox
  "push.apple.com", // Safari (macOS, iOS home-screen apps)
  "notify.windows.com", // Edge on Windows
];

export function isPushServiceEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
    return PUSH_SERVICE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export type PushMessage = { title: string; body: string; url?: string };

/**
 * Sends a notification to every browser the users have turned push on for.
 * Subscriptions the push service reports as gone are deleted. Never throws.
 */
export async function sendPush(userIds: string[], message: PushMessage) {
  if (!pushEnabled || userIds.length === 0) return;
  try {
    const [subscriptions, unread] = await Promise.all([
      prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } }),
      prisma.notification.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, isRead: false },
        _count: { _all: true },
      }),
    ]);
    if (subscriptions.length === 0) return;
    const unreadBy = new Map(unread.map((u) => [u.userId, u._count._all]));

    const gone: string[] = [];
    await Promise.all(
      subscriptions.map(async (s) => {
        const payload = JSON.stringify({ ...message, tag: message.url, unread: unreadBy.get(s.userId) ?? 0 });
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
            TTL: 24 * 60 * 60, // drop it if the device stays offline for a day
            urgency: "high",
            timeout: 10_000,
          });
        } catch (e) {
          if (e instanceof webpush.WebPushError && (e.statusCode === 404 || e.statusCode === 410)) gone.push(s.id);
          else console.warn("Web Push failed", e instanceof webpush.WebPushError ? e.statusCode : e);
        }
      }),
    );
    if (gone.length > 0) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  } catch (e) {
    console.error("Failed to send Web Push notifications", e);
  }
}
