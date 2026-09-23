import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Slows down password guessing: after MAX_FAILURES wrong passwords for the same
 * account the account is locked for the rest of the window.
 *
 * Counters live in the database (LoginThrottle) because serverless deployments
 * such as Vercel run many short-lived instances that share no memory. Keyed by
 * email only: without a trusted proxy the client IP can be spoofed, so keying on
 * it would let an attacker bypass the lock (see README for the trade-off).
 */
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

/** Minutes until the account unlocks, or 0 if a login attempt is allowed. */
export async function lockedMinutes(key: string, now = new Date()) {
  const row = await prisma.loginThrottle.findUnique({ where: { key } });
  if (!row || row.resetAt <= now || row.failures < MAX_FAILURES) return 0;
  return Math.ceil((row.resetAt.getTime() - now.getTime()) / 60000);
}

export async function recordFailure(key: string, now = new Date()) {
  const row = await prisma.loginThrottle.findUnique({ where: { key } });
  if (row && row.resetAt > now) {
    await prisma.loginThrottle.update({ where: { key }, data: { failures: { increment: 1 } } });
    return;
  }
  // No window yet, or it expired: start a new one.
  const resetAt = new Date(now.getTime() + WINDOW_MS);
  await prisma.loginThrottle.upsert({
    where: { key },
    create: { key, failures: 1, resetAt },
    update: { failures: 1, resetAt },
  });
  // Housekeeping: drop windows that ended more than a day ago.
  await prisma.loginThrottle.deleteMany({ where: { resetAt: { lt: new Date(now.getTime() - 86_400_000) } } });
}

export async function clearFailures(key: string) {
  await prisma.loginThrottle.deleteMany({ where: { key } });
}
