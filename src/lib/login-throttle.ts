import "server-only";

/**
 * Slows down password guessing: after MAX_FAILURES wrong passwords for the same
 * account the account is locked for the rest of the window.
 *
 * State lives in this server process, which is enough for a single Node server;
 * a multi-instance deployment would need a shared store (e.g. Redis) instead.
 */
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

const failures = new Map<string, { count: number; resetAt: number }>();

/** Minutes until the account unlocks, or 0 if a login attempt is allowed. */
export function lockedMinutes(key: string, now = Date.now()) {
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) return 0;
  return entry.count >= MAX_FAILURES ? Math.ceil((entry.resetAt - now) / 60000) : 0;
}

export function recordFailure(key: string, now = Date.now()) {
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count++;

  // Drop expired entries so the map can't grow without bound.
  if (failures.size > 10_000) {
    for (const [k, v] of failures) if (v.resetAt <= now) failures.delete(k);
  }
}

export function clearFailures(key: string) {
  failures.delete(key);
}
