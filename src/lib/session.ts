import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";

export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * For pages/layouts: returns the signed-in user or redirects.
 * Pass `roles` to restrict access to specific roles.
 */
export async function requireUser(roles?: Role[]) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.active) redirect("/login?error=inactive");
  if (roles && !roles.includes(session.user.role)) redirect("/");
  return session.user;
}

/** For server actions / route handlers: returns the user or null (never redirects). */
export async function currentUser(roles?: Role[]) {
  const session = await getSession();
  if (!session?.user?.id || !session.user.active) return null;
  if (roles && !roles.includes(session.user.role)) return null;
  return session.user;
}

export const STAFF_ROLES: Role[] = ["MAINTENANCE", "ADMIN"];

export function homePathFor(role: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "MAINTENANCE") return "/maintenance";
  return "/requests";
}
