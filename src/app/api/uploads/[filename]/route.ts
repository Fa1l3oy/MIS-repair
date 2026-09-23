import { prisma } from "@/lib/prisma";
import { canViewRequest } from "@/lib/requests";
import { currentUser } from "@/lib/session";
import { openImage } from "@/lib/uploads";

export async function GET(req: Request, ctx: RouteContext<"/api/uploads/[filename]">) {
  // Permission is checked right here, next to the read, on every request.
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { filename } = await ctx.params;
  const image = await prisma.repairImage.findUnique({
    where: { filename },
    select: { mimeType: true, request: { select: { reporterId: true } } },
  });
  if (!image || !canViewRequest(user, image.request)) return new Response("Not found", { status: 404 });

  const opened = await openImage(filename, req.headers.get("if-none-match"));
  if (!opened) return new Response("Not found", { status: 404 });

  // "private, no-cache": the browser may keep a copy but must revalidate every
  // time, so permissions are re-checked (e.g. after logout on a shared computer)
  // while unchanged images still come back as a cheap 304.
  const headers = {
    "Cache-Control": "private, no-cache",
    ETag: opened.etag,
    "X-Content-Type-Options": "nosniff",
  };
  if (opened.status === 304) return new Response(null, { status: 304, headers });
  return new Response(opened.body, { headers: { ...headers, "Content-Type": image.mimeType } });
}
