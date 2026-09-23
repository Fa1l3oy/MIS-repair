import { prisma } from "@/lib/prisma";
import { canViewRequest } from "@/lib/requests";
import { currentUser } from "@/lib/session";
import { readImage } from "@/lib/uploads";

export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[filename]">) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { filename } = await ctx.params;
  const image = await prisma.repairImage.findUnique({
    where: { filename },
    select: { mimeType: true, request: { select: { reporterId: true } } },
  });
  if (!image || !canViewRequest(user, image.request)) return new Response("Not found", { status: 404 });

  const data = await readImage(filename);
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
