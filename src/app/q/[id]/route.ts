import { prisma } from "@/lib/prisma";

/**
 * Target of printed QR stickers. proxy.ts sends signed-out users to /login
 * first (and back here afterwards), then this opens the pre-filled form.
 */
export async function GET(req: Request, ctx: RouteContext<"/q/[id]">) {
  const { id } = await ctx.params;
  const tag = /^[A-Za-z0-9]{4,32}$/.test(id)
    ? await prisma.qrTag.findUnique({ where: { id }, select: { id: true } })
    : null;
  const target = tag ? `/requests/new?tag=${tag.id}` : "/requests/new?tag=invalid";
  return Response.redirect(new URL(target, req.url), 307);
}
