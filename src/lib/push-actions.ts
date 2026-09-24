"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPushServiceEndpoint, pushEnabled, sendPush } from "@/lib/push";
import { currentUser } from "@/lib/session";

const subscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(isPushServiceEndpoint),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

/**
 * Links this browser's push subscription to the signed-in user. Also used to
 * re-link it when someone else signs in on the same browser.
 */
export async function savePushSubscription(input: unknown): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user || !pushEnabled) return { ok: false };
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const { endpoint, keys } = parsed.data;
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent, userId: user.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userAgent, userId: user.id },
  });
  return { ok: true };
}

export async function removePushSubscription(endpoint: unknown) {
  const user = await currentUser();
  if (!user || typeof endpoint !== "string") return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
}

/** "Send a test" button: pushes to every browser the user has turned on. */
export async function sendTestPush(): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user || !pushEnabled) return { ok: false };
  await sendPush([user.id], {
    title: "🔔 ทดสอบการแจ้งเตือน",
    body: "อุปกรณ์นี้จะได้รับการแจ้งเตือนเมื่อมีความเคลื่อนไหวของงานซ่อม",
    url: "/notifications",
  });
  return { ok: true };
}
