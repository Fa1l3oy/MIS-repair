import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ count: 0 }, { status: 401 });

  const count = await prisma.notification.count({ where: { userId: user.id, isRead: false } });
  return Response.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
