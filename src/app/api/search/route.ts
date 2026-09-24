import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/requests";
import { currentUser } from "@/lib/session";

/** Quick search for the command palette. Users only ever see their own requests. */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ requests: [] }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").replaceAll("\0", "").trim().slice(0, 100);
  if (!q) return Response.json({ requests: [] });

  const staff = isStaff(user);
  const contains = { contains: q, mode: "insensitive" as const };
  const where: Prisma.RepairRequestWhereInput = {
    ...(staff ? {} : { reporterId: user.id }),
    OR: [
      { code: contains },
      { equipment: contains },
      { location: contains },
      { assetNumber: contains },
      { building: { name: contains } },
      ...(staff ? [{ reporter: { name: contains } }] : []),
    ],
  };

  const requests = await prisma.repairRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      code: true,
      equipment: true,
      status: true,
      location: true,
      building: { select: { name: true } },
    },
  });
  return Response.json({ requests }, { headers: { "Cache-Control": "no-store" } });
}
